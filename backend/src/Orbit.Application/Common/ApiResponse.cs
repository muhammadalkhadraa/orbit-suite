using System.Collections.Generic;

namespace Orbit.Application.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string>? Errors { get; set; }

    public static ApiResponse<T> Ok(T? data = default, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            Message = message
        };
    }

    public static ApiResponse<T> Fail(string error, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Errors = new List<string> { error },
            Message = message
        };
    }

    public static ApiResponse<T> Fail(List<string> errors, string? message = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Errors = errors,
            Message = message
        };
    }
}
