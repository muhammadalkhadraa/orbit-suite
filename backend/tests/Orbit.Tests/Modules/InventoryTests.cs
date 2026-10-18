using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Modules.Inventory.Dtos;
using Orbit.Domain.Entities;
using Orbit.Domain.Enums;
using Orbit.Infrastructure.Persistence;
using Orbit.Infrastructure.Services;
using Xunit;

namespace Orbit.Tests.Modules;

public class InventoryTests
{
    private (OrbitDbContext db, TenantContext tenantContext, FakeCurrentUserService userService, InventoryService inventoryService)
        SetupTestEnvironment()
    {
        var tenantContext = new TenantContext();
        var userService = new FakeCurrentUserService();

        var options = new DbContextOptionsBuilder<OrbitDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var db = new OrbitDbContext(options, tenantContext, userService);
        var auditService = new AuditService(db, tenantContext, userService);
        var inventoryService = new InventoryService(db, tenantContext, userService, auditService);

        return (db, tenantContext, userService, inventoryService);
    }

    [Fact]
    public async Task Admin_CanCreateProduct_WithInitialStockAndMovement()
    {
        var (db, tenantContext, userService, inventoryService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Admin);
        userService.UserId = "admin-1";

        var branch = new Branch { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Main Warehouse", Code = "WH-01" };
        db.Branches.Add(branch);
        await db.SaveChangesAsync();

        var request = new CreateProductRequest
        {
            Sku = "SRV-RACK-42U",
            Name = "42U Enterprise Server Rack",
            Category = ProductCategory.Hardware,
            UnitOfMeasure = "unit",
            UnitPrice = 1200.00m,
            UnitCost = 750.00m,
            ReorderLevel = 5,
            InitialBranchId = branch.Id,
            InitialQuantity = 20,
            AisleBinLocation = "Aisle 3, Row B"
        };

        var result = await inventoryService.CreateProductAsync(request);

        result.Should().NotBeNull();
        result.Sku.Should().Be("SRV-RACK-42U");
        result.TotalQuantityOnHand.Should().Be(20);
        result.InventoryValuation.Should().Be(15000.00m); // 20 * 750
        result.IsLowStock.Should().BeFalse();
        result.BranchInventories.Should().HaveCount(1);
        result.BranchInventories[0].BranchName.Should().Be("Main Warehouse");

        // Verify movement ledger entry created
        var movements = await db.StockMovements.ToListAsync();
        movements.Should().HaveCount(1);
        movements[0].Type.Should().Be(StockMovementType.Receipt);
        movements[0].Quantity.Should().Be(20);
        movements[0].ReferenceNumber.Should().Be("INIT-SRV-RACK-42U");
    }

    [Fact]
    public async Task DuplicateSku_ThrowsValidationException()
    {
        var (db, tenantContext, userService, inventoryService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Admin);
        userService.UserId = "admin-1";

        var existingProduct = new Product
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Sku = "LAPTOP-X1",
            Name = "ThinkPad X1",
            UnitPrice = 1500.00m,
            UnitCost = 1100.00m
        };
        db.Products.Add(existingProduct);
        await db.SaveChangesAsync();

        var request = new CreateProductRequest
        {
            Sku = "laptop-x1", // Case-insensitive duplicate
            Name = "Duplicate Laptop",
            UnitPrice = 1600.00m,
            UnitCost = 1200.00m
        };

        Func<Task> act = async () => await inventoryService.CreateProductAsync(request);
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task Employee_CannotCreateCatalogItem_ThrowsForbiddenAccessException()
    {
        var (db, tenantContext, userService, inventoryService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "emp-1", TenantRole.Employee);
        userService.UserId = "emp-1";

        var request = new CreateProductRequest
        {
            Sku = "MON-4K-27",
            Name = "4K 27-inch Monitor",
            UnitPrice = 450.00m
        };

        Func<Task> act = async () => await inventoryService.CreateProductAsync(request);
        await act.Should().ThrowAsync<ForbiddenAccessException>()
            .WithMessage("*administrative permission*");
    }

    [Fact]
    public async Task StockAdjustment_Receipt_IncrementsQuantity()
    {
        var (db, tenantContext, userService, inventoryService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "mgr-1", TenantRole.Manager);
        userService.UserId = "mgr-1";

        var branch = new Branch { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Central Hub", Code = "HUB" };
        var product = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "CBL-CAT6", Name = "Cat6 Patch Cable", UnitCost = 3.50m };
        var inventory = new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = product.Id, BranchId = branch.Id, QuantityOnHand = 50 };

        db.Branches.Add(branch);
        db.Products.Add(product);
        db.ProductInventories.Add(inventory);
        await db.SaveChangesAsync();

        var adjustRequest = new AdjustStockRequest
        {
            ProductId = product.Id,
            BranchId = branch.Id,
            Type = StockMovementType.Receipt,
            Quantity = 100,
            ReferenceNumber = "PO-2026-901",
            Reason = "Supplier replenishment"
        };

        var movement = await inventoryService.AdjustStockAsync(adjustRequest);

        movement.Type.Should().Be(StockMovementType.Receipt);
        movement.Quantity.Should().Be(100);

        var updatedInventory = await db.ProductInventories.FirstAsync(i => i.Id == inventory.Id);
        updatedInventory.QuantityOnHand.Should().Be(150);
    }

    [Fact]
    public async Task StockAdjustment_Out_GuardsAgainstInsufficientStock()
    {
        var (db, tenantContext, userService, inventoryService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "mgr-1", TenantRole.Manager);
        userService.UserId = "mgr-1";

        var branch = new Branch { Id = Guid.NewGuid(), TenantId = tenantId, Name = "West Store", Code = "WS" };
        var product = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "SW-POE-24", Name = "PoE 24-Port Switch" };
        var inventory = new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = product.Id, BranchId = branch.Id, QuantityOnHand = 5 };

        db.Branches.Add(branch);
        db.Products.Add(product);
        db.ProductInventories.Add(inventory);
        await db.SaveChangesAsync();

        var adjustRequest = new AdjustStockRequest
        {
            ProductId = product.Id,
            BranchId = branch.Id,
            Type = StockMovementType.SaleShipment,
            Quantity = 10, // Exceeds 5
            Reason = "Customer Order #5541"
        };

        Func<Task> act = async () => await inventoryService.AdjustStockAsync(adjustRequest);
        await act.Should().ThrowAsync<ValidationException>()
            .WithMessage("*Insufficient stock*");
    }

    [Fact]
    public async Task StockAdjustment_Transfer_MovesStockBetweenBranches()
    {
        var (db, tenantContext, userService, inventoryService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Admin);
        userService.UserId = "admin-1";

        var branchA = new Branch { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Warehouse Alpha", Code = "W-A" };
        var branchB = new Branch { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Retail Branch Bravo", Code = "B-B" };
        var product = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "ROUTER-AX", Name = "Wi-Fi 6 Router", UnitCost = 90.00m };
        var inventoryA = new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = product.Id, BranchId = branchA.Id, QuantityOnHand = 30 };

        db.Branches.AddRange(branchA, branchB);
        db.Products.Add(product);
        db.ProductInventories.Add(inventoryA);
        await db.SaveChangesAsync();

        var transferRequest = new AdjustStockRequest
        {
            ProductId = product.Id,
            BranchId = branchA.Id,
            DestinationBranchId = branchB.Id,
            Type = StockMovementType.Transfer,
            Quantity = 12,
            ReferenceNumber = "TRF-0012",
            Reason = "Stock rebalancing"
        };

        var movement = await inventoryService.AdjustStockAsync(transferRequest);

        movement.Type.Should().Be(StockMovementType.Transfer);
        movement.Quantity.Should().Be(12);

        // Alpha stock decremented
        var updatedA = await db.ProductInventories.FirstAsync(i => i.ProductId == product.Id && i.BranchId == branchA.Id);
        updatedA.QuantityOnHand.Should().Be(18);

        // Bravo stock incremented (created dynamically if not present)
        var updatedB = await db.ProductInventories.FirstAsync(i => i.ProductId == product.Id && i.BranchId == branchB.Id);
        updatedB.QuantityOnHand.Should().Be(12);
    }

    [Fact]
    public async Task InventoryMetrics_CalculatesValuationAndAlertsCorrectly()
    {
        var (db, tenantContext, userService, inventoryService) = SetupTestEnvironment();
        var tenantId = Guid.NewGuid();

        tenantContext.SetContext(tenantId, "admin-1", TenantRole.Admin);
        userService.UserId = "admin-1";

        var branch = new Branch { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Main Depot", Code = "DEP" };
        db.Branches.Add(branch);

        // Product 1: In stock, above reorder level (100 * $10 = $1000)
        var p1 = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "P1", Name = "Item 1", UnitCost = 10m, ReorderLevel = 10, IsActive = true };
        var inv1 = new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = p1.Id, BranchId = branch.Id, QuantityOnHand = 100 };

        // Product 2: Low stock (4 <= 10) (4 * $50 = $200)
        var p2 = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "P2", Name = "Item 2", UnitCost = 50m, ReorderLevel = 10, IsActive = true };
        var inv2 = new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = p2.Id, BranchId = branch.Id, QuantityOnHand = 4 };

        // Product 3: Out of stock (0 <= 0)
        var p3 = new Product { Id = Guid.NewGuid(), TenantId = tenantId, Sku = "P3", Name = "Item 3", UnitCost = 25m, ReorderLevel = 5, IsActive = true };
        var inv3 = new ProductInventory { Id = Guid.NewGuid(), TenantId = tenantId, ProductId = p3.Id, BranchId = branch.Id, QuantityOnHand = 0 };

        db.Products.AddRange(p1, p2, p3);
        db.ProductInventories.AddRange(inv1, inv2, inv3);
        await db.SaveChangesAsync();

        var metrics = await inventoryService.GetInventoryMetricsAsync();

        metrics.TotalProductsCount.Should().Be(3);
        metrics.ActiveProductsCount.Should().Be(3);
        metrics.LowStockProductsCount.Should().Be(1);
        metrics.OutOfStockProductsCount.Should().Be(1);
        metrics.TotalUnitsOnHand.Should().Be(104);
        metrics.TotalInventoryValuation.Should().Be(1200m); // $1000 + $200
    }
}
