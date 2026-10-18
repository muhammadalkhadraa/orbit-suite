using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Crm;
using Orbit.Application.Modules.Crm.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<CustomerDto>>>> GetCustomers(
        [FromQuery] CustomerFilterRequest filter,
        CancellationToken cancellationToken)
    {
        var result = await _customerService.GetCustomersAsync(filter, cancellationToken);
        return Ok(ApiResponse<PagedResponse<CustomerDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> GetCustomerById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _customerService.GetCustomerByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<CustomerDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> CreateCustomer(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _customerService.CreateCustomerAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetCustomerById), new { id = result.Id }, ApiResponse<CustomerDto>.Ok(result, "Customer account created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> UpdateCustomer(
        Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _customerService.UpdateCustomerAsync(id, request, cancellationToken);
        return Ok(ApiResponse<CustomerDto>.Ok(result, "Customer account updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<string>>> DeleteCustomer(Guid id, CancellationToken cancellationToken)
    {
        await _customerService.DeleteCustomerAsync(id, cancellationToken);
        return Ok(ApiResponse<string>.Ok(string.Empty, "Customer account deleted successfully."));
    }
}
