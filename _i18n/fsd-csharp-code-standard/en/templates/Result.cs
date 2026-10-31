using System.Net;

using Flunt.Notifications;

namespace MyApp.Application.Platform;

/// <summary>
/// Result of a use case, in the Flunt notification pattern. The constructor used defines the HTTP status, and
/// whoever instantiates the <see cref="Result{T}"/> never chooses it:
/// <c>new Result&lt;T&gt;()</c> is success without data (201);
/// <c>new Result&lt;T&gt;(content)</c> is success with a single object (200);
/// <c>new Result&lt;T&gt;(items, pagination)</c> is success with a paginated collection (200);
/// <c>new Result&lt;T&gt;(notifications)</c> is a validation error (400, with all the notifications);
/// <c>new Result&lt;T&gt;(property, message)</c> with the field filled is resource not found (404) and with an
/// empty field is a server error (500), always with a single notification.
/// </summary>
public sealed class Result<T> : Notifiable where T : class
{
    /// <summary>Single server error message, used by every database operation error.</summary>
    public const string ServerErrorMessage = "An error occurred while executing the operation.";

    /// <summary>Creates a success without return data (201).</summary>
    public Result()
    {
        Status = HttpStatusCode.Created;
    }

    /// <summary>
    /// Creates an error with a single notification: resource not found (404) when <paramref name="property"/>
    /// is filled, or server error (500) when it is empty.
    /// </summary>
    /// <param name="property">Field the error refers to; empty on the server error.</param>
    /// <param name="message">
    /// Safe message, without internal detail; on the server error, use <see cref="ServerErrorMessage"/>.
    /// </param>
    public Result(string property, string message)
    {
        AddNotification(property, message);
        Status = string.IsNullOrWhiteSpace(property) ? HttpStatusCode.InternalServerError : HttpStatusCode.NotFound;
    }

    /// <summary>Creates a success with the single return object (200).</summary>
    /// <param name="content">Return object.</param>
    public Result(T content)
    {
        Content = [content];
        Status = HttpStatusCode.OK;
    }

    /// <summary>Creates a success with a paginated collection (200).</summary>
    /// <param name="items">Items of the page.</param>
    /// <param name="pagination">
    /// Pagination, passed as a tuple (page, size, next page) or (page, size, total), such as
    /// <c>(1, 20, 102)</c>.
    /// </param>
    public Result(IReadOnlyCollection<T> items, Pagination pagination)
    {
        Content = items;
        Pagination = pagination;
        Status = HttpStatusCode.OK;
    }

    /// <summary>Creates a validation error (400) with all the <paramref name="notifications"/>.</summary>
    /// <param name="notifications">Flunt notifications, each with the field and the message.</param>
    public Result(IReadOnlyCollection<Notification> notifications)
    {
        AddNotifications(notifications);
        Status = HttpStatusCode.BadRequest;
    }

    /// <summary>Return object or collection; empty on errors and on success without data.</summary>
    public IReadOnlyCollection<T?> Content { get; } = [];

    /// <summary>Pagination of the return collection; null when there is none.</summary>
    public Pagination? Pagination { get; }

    /// <summary>HTTP status defined by the constructor used.</summary>
    public HttpStatusCode Status { get; }

    /// <summary>Indicates whether the result is a success (status below 400).</summary>
    public bool IsSuccess => Status < HttpStatusCode.BadRequest;

    /// <summary>Indicates whether the result is a failure (status 400 or above).</summary>
    public bool IsFailure => !IsSuccess;
}
