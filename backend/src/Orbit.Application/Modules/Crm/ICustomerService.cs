using System;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Crm.Dtos;

namespace Orbit.Application.Modules.Crm;

public interface ICustomerService
{
    Task<PagedResponse<CustomerDto>> GetCustomersAsync(CustomerFilterRequest filter, CancellationToken cancellationToken = default);
    Task<CustomerDto> GetCustomerByIdAsync(Guid customerId, CancellationToken cancellationToken = default);
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<CustomerDto> UpdateCustomerAsync(Guid customerId, UpdateCustomerRequest request, CancellationToken cancellationToken = default);
    Task DeleteCustomerAsync(Guid customerId, CancellationToken cancellationToken = default);
}
