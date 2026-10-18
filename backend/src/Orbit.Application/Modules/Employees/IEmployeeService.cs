using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Common;
using Orbit.Application.Modules.Employees.Dtos;

namespace Orbit.Application.Modules.Employees;

public interface IEmployeeService
{
    Task<PagedResponse<EmployeeSummaryDto>> GetEmployeesAsync(int pageNumber, int pageSize, string? search = null, Guid? departmentId = null, Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<EmployeeSummaryDto> GetEmployeeByIdAsync(Guid employeeId, CancellationToken cancellationToken = default);
    Task<EmployeeSummaryDto> CreateEmployeeAsync(CreateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task<EmployeeSummaryDto> UpdateEmployeeAsync(Guid employeeId, UpdateEmployeeRequest request, CancellationToken cancellationToken = default);
    Task DeleteEmployeeAsync(Guid employeeId, CancellationToken cancellationToken = default);
}
