using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Inventory.Dtos;

namespace Orbit.Application.Modules.Inventory;

public interface IInventoryService
{
    Task<PagedResponse<ProductDto>> GetProductsAsync(ProductFilterRequest filter, CancellationToken cancellationToken = default);
    Task<ProductDto> GetProductByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProductDto> GetProductBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateProductAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken = default);
    Task DeleteProductAsync(Guid id, CancellationToken cancellationToken = default);
    Task<StockMovementDto> AdjustStockAsync(AdjustStockRequest request, CancellationToken cancellationToken = default);
    Task<List<ProductInventoryDto>> GetProductInventoriesAsync(Guid productId, CancellationToken cancellationToken = default);
    Task<PagedResponse<StockMovementDto>> GetStockMovementsAsync(StockMovementFilterRequest filter, CancellationToken cancellationToken = default);
    Task<InventoryMetricsDto> GetInventoryMetricsAsync(CancellationToken cancellationToken = default);
}
