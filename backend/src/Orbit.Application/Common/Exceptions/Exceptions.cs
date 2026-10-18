using System;
using System.Collections.Generic;

namespace Orbit.Application.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
    public NotFoundException(string name, object key) : base($"Entity '{name}' ({key}) was not found.") { }
}

public class TenantAccessDeniedException : Exception
{
    public TenantAccessDeniedException(string message = "Access to the requested tenant is denied or membership is invalid.")
        : base(message) { }
}

public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException(string message = "You do not have permission to perform this action.")
        : base(message) { }
}

public class ValidationException : Exception
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException() : base("One or more validation failures have occurred.")
    {
        Errors = new Dictionary<string, string[]>();
    }

    public ValidationException(IDictionary<string, string[]> errors) : base("One or more validation failures have occurred.")
    {
        Errors = errors;
    }

    public ValidationException(string propertyName, string error) : base("One or more validation failures have occurred.")
    {
        Errors = new Dictionary<string, string[]> { { propertyName, new[] { error } } };
    }

    public ValidationException(string message) : base(message)
    {
        Errors = new Dictionary<string, string[]>();
    }
}
