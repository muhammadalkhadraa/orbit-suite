using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Orbit.Application.Modules.Payroll.Dtos;

namespace Orbit.Application.Modules.Payroll;

public interface IPayrollService
{
    Task<List<PayrollRecordDto>> GetPayrollRecordsAsync(int? year, int? month, Guid? employeeId, CancellationToken cancellationToken = default);
    Task<PayrollRecordDto> GetPayrollRecordByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PayrollSummaryDto> GetPayrollSummaryAsync(int year, int month, CancellationToken cancellationToken = default);
    Task<List<PayrollRecordDto>> GeneratePayrollBatchAsync(GeneratePayrollBatchRequest request, CancellationToken cancellationToken = default);
    Task<PayrollRecordDto> InitiatePayrollForEmployeeAsync(InitiatePayrollRequest request, CancellationToken cancellationToken = default);
    Task<PayrollRecordDto> SubmitHrSheetAsync(Guid payrollId, SubmitHrSheetRequest request, CancellationToken cancellationToken = default);
    Task<PayrollRecordDto> FinalizeAndSendToHrAsync(Guid payrollId, CancellationToken cancellationToken = default);
    Task<List<PayrollRecordDto>> ApprovePayrollBatchAsync(ApprovePayrollBatchRequest request, CancellationToken cancellationToken = default);
    Task<EmployeePayslipSpreadsheetDto> GetEmployeePayslipSpreadsheetAsync(Guid payrollId, CancellationToken cancellationToken = default);
    Task<EmployeePayslipSpreadsheetDto> GetMasterPayrollSpreadsheetAsync(int year, int month, CancellationToken cancellationToken = default);
    Task<SendEmailResultDto> SendEmployeePayslipEmailAsync(Guid payrollId, CancellationToken cancellationToken = default);
    Task<List<SendEmailResultDto>> SendAllPayslipsBatchEmailAsync(int year, int month, CancellationToken cancellationToken = default);
}
