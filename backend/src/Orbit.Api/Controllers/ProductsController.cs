using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Inventory;
using Orbit.Application.Modules.Inventory.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/inventory")]
public class ProductsController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public ProductsController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet("products")]
    public async Task<ActionResult<ApiResponse<PagedResponse<ProductDto>>>> GetProducts(
        [FromQuery] ProductFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetProductsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<ProductDto>>.Ok(result));
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<ApiResponse<InventoryMetricsDto>>> GetMetrics(CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetInventoryMetricsAsync(cancellationToken);
        return Ok(ApiResponse<InventoryMetricsDto>.Ok(result));
    }

    [HttpGet("products/{id}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetProductById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetProductByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(result));
    }

    [HttpGet("products/sku/{sku}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetProductBySku(string sku, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetProductBySkuAsync(sku, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(result));
    }

    [HttpPost("products")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> CreateProduct(
        [FromBody] CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _inventoryService.CreateProductAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetProductById), new { id = result.Id }, ApiResponse<ProductDto>.Ok(result, "Product added to catalog."));
    }

    [HttpPut("products/{id}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> UpdateProduct(
        Guid id,
        [FromBody] UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _inventoryService.UpdateProductAsync(id, request, cancellationToken);
        return Ok(ApiResponse<ProductDto>.Ok(result, "Product updated successfully."));
    }

    [HttpDelete("products/{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteProduct(Guid id, CancellationToken cancellationToken)
    {
        await _inventoryService.DeleteProductAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok("Product removed or deactivated.", "Catalog item managed."));
    }

    [HttpGet("products/{id}/locations")]
    public async Task<ActionResult<ApiResponse<List<ProductInventoryDto>>>> GetProductLocations(Guid id, CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetProductInventoriesAsync(id, cancellationToken);
        return Ok(ApiResponse<List<ProductInventoryDto>>.Ok(result));
    }

    [HttpPost("adjust")]
    public async Task<ActionResult<ApiResponse<StockMovementDto>>> AdjustStock(
        [FromBody] AdjustStockRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _inventoryService.AdjustStockAsync(request, cancellationToken);
        return Ok(ApiResponse<StockMovementDto>.Ok(result, $"Stock adjustment recorded ({result.Type}: {result.Quantity})."));
    }

    [HttpGet("movements")]
    public async Task<ActionResult<ApiResponse<PagedResponse<StockMovementDto>>>> GetMovements(
        [FromQuery] StockMovementFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _inventoryService.GetStockMovementsAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<StockMovementDto>>.Ok(result));
    }
}
