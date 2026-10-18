using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Modules.Organization.Dtos;

namespace Orbit.Application.Modules.Organization;

public interface IOrganizationService
{
    Task<TenantDetailsDto> GetCurrentTenantDetailsAsync(CancellationToken cancellationToken = default);
    Task<TenantDetailsDto> UpdateTenantAsync(UpdateTenantRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<BranchDto>> GetBranchesAsync(CancellationToken cancellationToken = default);
    Task<BranchDto> GetBranchByIdAsync(Guid branchId, CancellationToken cancellationToken = default);
    Task<BranchDto> CreateBranchAsync(CreateBranchRequest request, CancellationToken cancellationToken = default);
    Task<BranchDto> UpdateBranchAsync(Guid branchId, UpdateBranchRequest request, CancellationToken cancellationToken = default);
    Task DeleteBranchAsync(Guid branchId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DepartmentDto>> GetDepartmentsAsync(CancellationToken cancellationToken = default);
    Task<DepartmentDto> GetDepartmentByIdAsync(Guid departmentId, CancellationToken cancellationToken = default);
    Task<DepartmentDto> CreateDepartmentAsync(CreateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task<DepartmentDto> UpdateDepartmentAsync(Guid departmentId, UpdateDepartmentRequest request, CancellationToken cancellationToken = default);
    Task DeleteDepartmentAsync(Guid departmentId, CancellationToken cancellationToken = default);
}
