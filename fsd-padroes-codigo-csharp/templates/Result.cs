using System.Net;

using Flunt.Notifications;

namespace GestaoCaptacao.Application.Platform;

/// <summary>
/// Resultado de um caso de uso, no padrão de notificações do Flunt. O construtor usado define o status HTTP, e
/// quem instancia o <see cref="Result{T}"/> nunca o escolhe:
/// <c>new Result&lt;T&gt;()</c> é sucesso sem dados (201);
/// <c>new Result&lt;T&gt;(content)</c> é sucesso com um objeto único (200);
/// <c>new Result&lt;T&gt;(items, pagination)</c> é sucesso com coleção paginada (200);
/// <c>new Result&lt;T&gt;(notifications)</c> é erro de validação (400, com todas as notificações);
/// <c>new Result&lt;T&gt;(property, message)</c> com o campo preenchido é recurso não encontrado (404) e com o
/// campo vazio é erro de servidor (500), sempre com uma única notificação.
/// </summary>
public sealed class Result<T> : Notifiable where T : class
{
    /// <summary>Mensagem única de erro de servidor, usada por todo erro de operação na base de dados.</summary>
    public const string ServerErrorMessage = "Ocorreu um erro ao executar a operação.";

    /// <summary>Cria um sucesso sem dados de retorno (201).</summary>
    public Result()
    {
        Status = HttpStatusCode.Created;
    }

    /// <summary>
    /// Cria um erro com uma única notificação: recurso não encontrado (404) quando o <paramref name="property"/>
    /// está preenchido, ou erro de servidor (500) quando está vazio.
    /// </summary>
    /// <param name="property">Campo a que o erro se refere; vazio no erro de servidor.</param>
    /// <param name="message">
    /// Mensagem segura, sem detalhe interno; no erro de servidor, use <see cref="ServerErrorMessage"/>.
    /// </param>
    public Result(string property, string message)
    {
        AddNotification(property, message);
        Status = string.IsNullOrWhiteSpace(property) ? HttpStatusCode.InternalServerError : HttpStatusCode.NotFound;
    }

    /// <summary>Cria um sucesso com o objeto único de retorno (200).</summary>
    /// <param name="content">Objeto de retorno.</param>
    public Result(T content)
    {
        Content = [content];
        Status = HttpStatusCode.OK;
    }

    /// <summary>Cria um sucesso com uma coleção paginada (200).</summary>
    /// <param name="items">Itens da página.</param>
    /// <param name="pagination">
    /// Paginação, passada por tupla (página, tamanho, próxima página) ou (página, tamanho, total), como
    /// <c>(1, 20, 102)</c>.
    /// </param>
    public Result(IReadOnlyCollection<T> items, Pagination pagination)
    {
        Content = items;
        Pagination = pagination;
        Status = HttpStatusCode.OK;
    }

    /// <summary>Cria um erro de validação (400) com todas as <paramref name="notifications"/>.</summary>
    /// <param name="notifications">Notificações do Flunt, cada uma com o campo e a mensagem.</param>
    public Result(IReadOnlyCollection<Notification> notifications)
    {
        AddNotifications(notifications);
        Status = HttpStatusCode.BadRequest;
    }

    /// <summary>Objeto ou coleção de retorno; vazio nos erros e no sucesso sem dados.</summary>
    public IReadOnlyCollection<T?> Content { get; } = [];

    /// <summary>Paginação da coleção de retorno; nula quando não há.</summary>
    public Pagination? Pagination { get; }

    /// <summary>Status HTTP definido pelo construtor usado.</summary>
    public HttpStatusCode Status { get; }

    /// <summary>Indica se o resultado é um sucesso (status abaixo de 400).</summary>
    public bool IsSuccess => Status < HttpStatusCode.BadRequest;

    /// <summary>Indica se o resultado é uma falha (status 400 ou acima).</summary>
    public bool IsFailure => !IsSuccess;
}
