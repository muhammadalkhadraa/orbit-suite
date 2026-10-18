using System;
using System.Collections.Generic;
using Orbit.Domain.Enums;

namespace Orbit.Application.Modules.Inventory.Dtos;

public class ProductDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductCategory Category { get; set; }
    public string CategoryName => Category.ToString();
    public string UnitOfMeasure { get; set; } = "pcs";
    public decimal UnitPrice { get; set; }
    public decimal UnitCost { get; set; }
    public decimal ReorderLevel { get; set; }
    public bool IsActive { get; set; }

    public decimal TotalQuantityOnHand { get; set; }
    public decimal TotalQuantityReserved { get; set; }
    public decimal TotalQuantityAvailable => TotalQuantityOnHand - TotalQuantityReserved;
    public bool IsLowStock => TotalQuantityOnHand <= ReorderLevel;
    public decimal InventoryValuation => TotalQuantityOnHand * UnitCost;

    public List<ProductInventoryDto> BranchInventories { get; set; } = new();

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class ProductInventoryDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string BranchCode { get; set; } = string.Empty;
    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }
    public decimal QuantityAvailable => QuantityOnHand - QuantityReserved;
    public string? AisleBinLocation { get; set; }
    public bool IsLowStock { get; set; }
}

public class StockMovementDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSku { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public Guid? DestinationBranchId { get; set; }
    public string? DestinationBranchName { get; set; }
    public StockMovementType Type { get; set; }
    public string TypeName => Type.ToString();
    public decimal Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public decimal TotalCost => (UnitCost ?? 0) * Quantity;
    public string? ReferenceNumber { get; set; }
    public string? Reason { get; set; }
    public Guid? PerformedByEmployeeId { get; set; }
    public string? PerformedByEmployeeName { get; set; }
    public DateTime TimestampUtc { get; set; }
}

public class CreateProductRequest
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductCategory Category { get; set; } = ProductCategory.Hardware;
    public string UnitOfMeasure { get; set; } = "pcs";
    public decimal UnitPrice { get; set; }
    public decimal UnitCost { get; set; }
    public decimal ReorderLevel { get; set; } = 10;
    public Guid? InitialBranchId { get; set; }
    public decimal? InitialQuantity { get; set; }
    public string? AisleBinLocation { get; set; }
}

public class UpdateProductRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductCategory Category { get; set; }
    public string UnitOfMeasure { get; set; } = "pcs";
    public decimal UnitPrice { get; set; }
    public decimal UnitCost { get; set; }
    public decimal ReorderLevel { get; set; }
    public bool IsActive { get; set; }
}

public class AdjustStockRequest
{
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public StockMovementType Type { get; set; }
    public decimal Quantity { get; set; }
    public Guid? DestinationBranchId { get; set; }
    public decimal? UnitCost { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? Reason { get; set; }
    public string? AisleBinLocation { get; set; }
}

public class ProductFilterRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public ProductCategory? Category { get; set; }
    public bool? IsActive { get; set; }
    public Guid? BranchId { get; set; }
    public bool? IsLowStock { get; set; }
    public string? Search { get; set; }
}

public class StockMovementFilterRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public Guid? ProductId { get; set; }
    public Guid? BranchId { get; set; }
    public StockMovementType? Type { get; set; }
    public DateTime? FromDateUtc { get; set; }
    public DateTime? ToDateUtc { get; set; }
    public string? Search { get; set; }
}

public class InventoryMetricsDto
{
    public int TotalProductsCount { get; set; }
    public int ActiveProductsCount { get; set; }
    public int LowStockProductsCount { get; set; }
    public int OutOfStockProductsCount { get; set; }
    public decimal TotalInventoryValuation { get; set; }
    public decimal TotalUnitsOnHand { get; set; }
    public int RecentMovementsCount { get; set; }
}
