using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Employees;
using Orbit.Application.Modules.Employees.Dtos;
using Orbit.Domain.Enums;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/employees")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;
    private readonly ITenantContext _tenantContext;

    public EmployeesController(IEmployeeService employeeService, ITenantContext tenantContext)
    {
        _employeeService = employeeService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<EmployeeSummaryDto>>>> GetEmployees(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] Guid? branchId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _employeeService.GetEmployeesAsync(pageNumber, pageSize, search, departmentId, branchId, cancellationToken);
        return Ok(ApiResponse<PagedResponse<EmployeeSummaryDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<EmployeeSummaryDto>>> GetEmployeeById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _employeeService.GetEmployeeByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeeSummaryDto>.Ok(result));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<EmployeeSummaryDto>>> CreateEmployee([FromBody] CreateEmployeeRequest request, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        var result = await _employeeService.CreateEmployeeAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetEmployeeById), new { id = result.Id }, ApiResponse<EmployeeSummaryDto>.Ok(result, "Employee created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<EmployeeSummaryDto>>> UpdateEmployee(Guid id, [FromBody] UpdateEmployeeRequest request, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        var result = await _employeeService.UpdateEmployeeAsync(id, request, cancellationToken);
        return Ok(ApiResponse<EmployeeSummaryDto>.Ok(result, "Employee updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteEmployee(Guid id, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        await _employeeService.DeleteEmployeeAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Employee deleted successfully."));
    }

    private void AssertAdminOrOwner()
    {
        var role = _tenantContext.CurrentRole;
        if (role != TenantRole.Owner && role != TenantRole.Admin)
        {
            throw new ForbiddenAccessException("Only company Owners or Administrators can manage employee profiles.");
        }
    }
}
