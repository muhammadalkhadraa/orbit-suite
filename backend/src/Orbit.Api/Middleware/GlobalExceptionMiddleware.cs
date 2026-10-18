using System;
using System.Security;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Orbit.Application.Common;
using Orbit.Application.Common.Exceptions;

namespace Orbit.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        int statusCode;
        ApiResponse<object> response;

        switch (exception)
        {
            case ValidationException valEx:
                statusCode = StatusCodes.Status400BadRequest;
                var errors = new System.Collections.Generic.List<string>();
                foreach (var errPair in valEx.Errors)
                {
                    foreach (var msg in errPair.Value)
                    {
                        errors.Add($"{errPair.Key}: {msg}");
                    }
                }
                response = ApiResponse<object>.Fail(errors, valEx.Message);
                break;

            case NotFoundException nfEx:
                statusCode = StatusCodes.Status404NotFound;
                response = ApiResponse<object>.Fail(nfEx.Message, "Not Found");
                break;

            case TenantAccessDeniedException tadEx:
                statusCode = StatusCodes.Status403Forbidden;
                response = ApiResponse<object>.Fail(tadEx.Message, "Tenant Access Denied");
                break;

            case ForbiddenAccessException fbEx:
                statusCode = StatusCodes.Status403Forbidden;
                response = ApiResponse<object>.Fail(fbEx.Message, "Forbidden");
                break;

            case SecurityException secEx:
                statusCode = StatusCodes.Status403Forbidden;
                response = ApiResponse<object>.Fail(secEx.Message, "Security Policy Violation");
                break;

            case UnauthorizedAccessException uEx:
                statusCode = StatusCodes.Status401Unauthorized;
                response = ApiResponse<object>.Fail(uEx.Message, "Unauthorized");
                break;

            default:
                _logger.LogError(exception, "Unhandled exception occurred: {Message}", exception.Message);
                statusCode = StatusCodes.Status500InternalServerError;
                response = ApiResponse<object>.Fail("An unexpected server error occurred. Please contact support.", "Internal Server Error");
                break;
        }

        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
