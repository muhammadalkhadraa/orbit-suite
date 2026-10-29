using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Orbit.Application.Common;
using Orbit.Application.Modules.Payroll;
using Orbit.Application.Modules.Payroll.Dtos;

namespace Orbit.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/payroll")]
public class PayrollController : ControllerBase
{
    private readonly IPayrollService _payrollService;

    public PayrollController(IPayrollService payrollService)
    {
        _payrollService = payrollService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PayrollRecordDto>>>> GetPayrollRecords(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] Guid? employeeId,
        CancellationToken cancellationToken)
    {
        var result = await _payrollService.GetPayrollRecordsAsync(year, month, employeeId, cancellationToken);
        return Ok(ApiResponse<List<PayrollRecordDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<PayrollRecordDto>>> GetPayrollRecordById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _payrollService.GetPayrollRecordByIdAsync(id, cancellationToken);
        return Ok(ApiResponse<PayrollRecordDto>.Ok(result));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<ApiResponse<PayrollSummaryDto>>> GetPayrollSummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var m = month ?? DateTime.UtcNow.Month;
        var result = await _payrollService.GetPayrollSummaryAsync(y, m, cancellationToken);
        return Ok(ApiResponse<PayrollSummaryDto>.Ok(result));
    }

    [HttpPost("generate")]
    public async Task<ActionResult<ApiResponse<List<PayrollRecordDto>>>> GeneratePayrollBatch(
        [FromBody] GeneratePayrollBatchRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _payrollService.GeneratePayrollBatchAsync(request, cancellationToken);
        return Ok(ApiResponse<List<PayrollRecordDto>>.Ok(result, $"Payroll generated for {result.Count} employees."));
    }

    [HttpPost("initiate")]
    public async Task<ActionResult<ApiResponse<PayrollRecordDto>>> InitiatePayrollForEmployee(
        [FromBody] InitiatePayrollRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _payrollService.InitiatePayrollForEmployeeAsync(request, cancellationToken);
        return Ok(ApiResponse<PayrollRecordDto>.Ok(result, $"Salary calculation initiated for employee. Awaiting HR Attendance & Deductions Sheet."));
    }

    [HttpPost("{id}/hr-sheet")]
    public async Task<ActionResult<ApiResponse<PayrollRecordDto>>> SubmitHrSheet(
        Guid id,
        [FromBody] SubmitHrSheetRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _payrollService.SubmitHrSheetAsync(id, request, cancellationToken);
        return Ok(ApiResponse<PayrollRecordDto>.Ok(result, $"HR Attendance & Deductions Sheet successfully submitted to Accounting."));
    }

    [HttpPost("{id}/finalize-to-hr")]
    public async Task<ActionResult<ApiResponse<PayrollRecordDto>>> FinalizeAndSendToHr(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _payrollService.FinalizeAndSendToHrAsync(id, cancellationToken);
        return Ok(ApiResponse<PayrollRecordDto>.Ok(result, $"Payroll calculated and finalized by Accounting. Sent to HR for email dispatch."));
    }

    [HttpPost("approve")]
    public async Task<ActionResult<ApiResponse<List<PayrollRecordDto>>>> ApprovePayrollBatch(
        [FromBody] ApprovePayrollBatchRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _payrollService.ApprovePayrollBatchAsync(request, cancellationToken);
        return Ok(ApiResponse<List<PayrollRecordDto>>.Ok(result, $"Monthly payroll approved for {result.Count} employees."));
    }

    [HttpGet("{id}/spreadsheet")]
    public async Task<IActionResult> DownloadEmployeePayslipSpreadsheet(Guid id, CancellationToken cancellationToken)
    {
        var result = await _payrollService.GetEmployeePayslipSpreadsheetAsync(id, cancellationToken);
        var bytes = Encoding.UTF8.GetBytes(result.FileContent);
        return File(bytes, "text/csv", result.FileName);
    }

    [HttpGet("{id}/spreadsheet-data")]
    public async Task<ActionResult<ApiResponse<EmployeePayslipSpreadsheetDto>>> GetEmployeePayslipSpreadsheetData(Guid id, CancellationToken cancellationToken)
    {
        var result = await _payrollService.GetEmployeePayslipSpreadsheetAsync(id, cancellationToken);
        return Ok(ApiResponse<EmployeePayslipSpreadsheetDto>.Ok(result));
    }

    [HttpGet("master-spreadsheet")]
    public async Task<IActionResult> DownloadMasterPayrollSpreadsheet(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var m = month ?? DateTime.UtcNow.Month;
        var result = await _payrollService.GetMasterPayrollSpreadsheetAsync(y, m, cancellationToken);
        var bytes = Encoding.UTF8.GetBytes(result.FileContent);
        return File(bytes, "text/csv", result.FileName);
    }

    [HttpPost("{id}/email")]
    public async Task<ActionResult<ApiResponse<SendEmailResultDto>>> SendEmployeePayslipEmail(Guid id, CancellationToken cancellationToken)
    {
        var result = await _payrollService.SendEmployeePayslipEmailAsync(id, cancellationToken);
        return Ok(ApiResponse<SendEmailResultDto>.Ok(result, result.Message));
    }

    [HttpPost("email-batch")]
    public async Task<ActionResult<ApiResponse<List<SendEmailResultDto>>>> SendAllPayslipsBatchEmail(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken cancellationToken)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var m = month ?? DateTime.UtcNow.Month;
        var result = await _payrollService.SendAllPayslipsBatchEmailAsync(y, m, cancellationToken);
        return Ok(ApiResponse<List<SendEmailResultDto>>.Ok(result, $"Payslip spreadsheets dispatched via email to {result.Count} employees."));
    }
}
