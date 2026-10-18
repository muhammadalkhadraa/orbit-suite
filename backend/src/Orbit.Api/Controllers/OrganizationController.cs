using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;
using Orbit.Application.Interfaces;
using Orbit.Application.Modules.Organization;
using Orbit.Application.Modules.Organization.Dtos;
using Orbit.Domain.Enums;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/organization")]
public class OrganizationController : ControllerBase
{
    private readonly IOrganizationService _organizationService;
    private readonly ITenantContext _tenantContext;

    public OrganizationController(IOrganizationService organizationService, ITenantContext tenantContext)
    {
        _organizationService = organizationService;
        _tenantContext = tenantContext;
    }

    [HttpGet("company")]
    public async Task<ActionResult<ApiResponse<TenantDetailsDto>>> GetCompany(CancellationToken cancellationToken)
    {
        var result = await _organizationService.GetCurrentTenantDetailsAsync(cancellationToken);
        return Ok(ApiResponse<TenantDetailsDto>.Ok(result));
    }

    [HttpPut("company")]
    public async Task<ActionResult<ApiResponse<TenantDetailsDto>>> UpdateCompany([FromBody] UpdateTenantRequest request, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        var result = await _organizationService.UpdateTenantAsync(request, cancellationToken);
        return Ok(ApiResponse<TenantDetailsDto>.Ok(result, "Company details updated successfully."));
    }

    [HttpGet("branches")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<BranchDto>>>> GetBranches(CancellationToken cancellationToken)
    {
        var result = await _organizationService.GetBranchesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BranchDto>>.Ok(result));
    }

    [HttpGet("branches/{id}")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> GetBranchById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _organizationService.GetBranchByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<BranchDto>.Ok(result));
    }

    [HttpPost("branches")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> CreateBranch([FromBody] CreateBranchRequest request, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        var result = await _organizationService.CreateBranchAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetBranchById), new { id = result.Id }, ApiResponse<BranchDto>.Ok(result, "Branch created successfully."));
    }

    [HttpPut("branches/{id}")]
    public async Task<ActionResult<ApiResponse<BranchDto>>> UpdateBranch(Guid id, [FromBody] UpdateBranchRequest request, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        var result = await _organizationService.UpdateBranchAsync(id, request, cancellationToken);
        return Ok(ApiResponse<BranchDto>.Ok(result, "Branch updated successfully."));
    }

    [HttpDelete("branches/{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteBranch(Guid id, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        await _organizationService.DeleteBranchAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Branch deleted successfully."));
    }

    [HttpGet("departments")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<DepartmentDto>>>> GetDepartments(CancellationToken cancellationToken)
    {
        var result = await _organizationService.GetDepartmentsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DepartmentDto>>.Ok(result));
    }

    [HttpGet("departments/{id}")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> GetDepartmentById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _organizationService.GetDepartmentByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<DepartmentDto>.Ok(result));
    }

    [HttpPost("departments")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> CreateDepartment([FromBody] CreateDepartmentRequest request, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        var result = await _organizationService.CreateDepartmentAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetDepartmentById), new { id = result.Id }, ApiResponse<DepartmentDto>.Ok(result, "Department created successfully."));
    }

    [HttpPut("departments/{id}")]
    public async Task<ActionResult<ApiResponse<DepartmentDto>>> UpdateDepartment(Guid id, [FromBody] UpdateDepartmentRequest request, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        var result = await _organizationService.UpdateDepartmentAsync(id, request, cancellationToken);
        return Ok(ApiResponse<DepartmentDto>.Ok(result, "Department updated successfully."));
    }

    [HttpDelete("departments/{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteDepartment(Guid id, CancellationToken cancellationToken)
    {
        AssertAdminOrOwner();
        await _organizationService.DeleteDepartmentAsync(id, cancellationToken);
        return Ok(ApiResponse<object>.Ok(null, "Department deleted successfully."));
    }

    private void AssertAdminOrOwner()
    {
        var role = _tenantContext.CurrentRole;
        if (role != TenantRole.Owner && role != TenantRole.Admin)
        {
            throw new ForbiddenAccessException("Only company Owners or Administrators can modify organization structures.");
        }
    }
}
