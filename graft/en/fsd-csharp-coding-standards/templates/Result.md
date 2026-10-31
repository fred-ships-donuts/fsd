# en/fsd-csharp-coding-standards/templates/Result.cs

- Result · class · L17-L85 — public sealed class Result<T> : Notifiable where T : class
- Result · method · L23-L26 — public Result()
- Result · method · L36-L40 — public Result(string property, string message)
- Result · method · L44-L48 — public Result(T content)
- Result · method · L56-L61 — public Result(IReadOnlyCollection<T> items, Pagination pagination)
- Result · method · L65-L69 — public Result(IReadOnlyCollection<Notification> notifications)
- Content · variable · L72-L72 — public IReadOnlyCollection<T?> Content { get; } = [];
- Pagination · variable · L75-L75 — public Pagination? Pagination { get; }
- Status · variable · L78-L78 — public HttpStatusCode Status { get; }
- IsSuccess · variable · L81-L81 — public bool IsSuccess => Status < HttpStatusCode.BadRequest;
- IsFailure · variable · L84-L84 — public bool IsFailure => !IsSuccess;
