# Imposição no build

## `.editorconfig`

O `.editorconfig` fica na raiz da solução. As opções definem a preferência; a severidade de cada regra vai em `dotnet_diagnostic.<ID>.severity`, que é a forma respeitada no build.

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.{csproj,props,targets,json,slnx}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.cs]

# Limite de 120 colunas (lido pelo editor; o compilador não confere)
max_line_length = 120

# Diretivas using: fora do namespace, System primeiro, grupos separados
dotnet_sort_system_directives_first = true
dotnet_separate_import_directive_groups = true
csharp_using_directive_placement = outside_namespace

# Namespace de arquivo
csharp_style_namespace_declarations = file_scoped

# Visibilidade explícita e como primeiro modificador
dotnet_style_require_accessibility_modifiers = for_non_interface_members
csharp_preferred_modifier_order = public, private, protected, internal, file, static, extern, new, virtual, abstract, sealed, override, readonly, unsafe, required, volatile, async

# Sem this.
dotnet_style_qualification_for_field = false
dotnet_style_qualification_for_property = false
dotnet_style_qualification_for_method = false
dotnet_style_qualification_for_event = false

# Palavra-chave da linguagem em vez do tipo do BCL
dotnet_style_predefined_type_for_locals_parameters_members = true
dotnet_style_predefined_type_for_member_access = true

# var em toda variável local com tipo inferido, inclusive var x = new T(...)
csharp_style_var_for_built_in_types = true
csharp_style_var_when_type_is_apparent = true
csharp_style_var_elsewhere = true

# new() em campo e propriedade com o tipo declarado; expressão de coleção
csharp_style_implicit_object_creation_when_type_is_apparent = true
dotnet_style_prefer_collection_expression = when_types_loosely_match

# Campo que não muda é readonly
dotnet_style_readonly_field = true

# Construtor primário e using em declaração
csharp_style_prefer_primary_constructors = true
csharp_prefer_simple_using_statement = true

# Pattern matching e switch de expressão
csharp_style_prefer_pattern_matching = true
csharp_style_prefer_not_pattern = true
csharp_style_pattern_matching_over_as_with_null_check = true
csharp_style_pattern_matching_over_is_with_cast_check = true
csharp_style_prefer_switch_expression = true
csharp_style_prefer_null_check_over_type_check = true
dotnet_style_prefer_is_null_check_over_reference_equality_method = true

# Corpo de expressão quando o corpo é uma única expressão; construtor sempre em bloco
csharp_style_expression_bodied_constructors = false
csharp_style_expression_bodied_methods = true
csharp_style_expression_bodied_operators = true
csharp_style_expression_bodied_local_functions = true
csharp_style_expression_bodied_properties = true
csharp_style_expression_bodied_indexers = true
csharp_style_expression_bodied_accessors = true
csharp_style_expression_bodied_lambdas = true

# Chaves no estilo Allman; sem chaves só em instrução de uma linha
csharp_prefer_braces = when_multiline
csharp_new_line_before_open_brace = all
csharp_new_line_before_else = true
csharp_new_line_before_catch = true
csharp_new_line_before_finally = true
csharp_new_line_before_members_in_object_initializers = true
csharp_new_line_before_members_in_anonymous_types = true
csharp_new_line_between_query_expression_clauses = true

# Indentação e espaços
csharp_indent_case_contents = true
csharp_indent_switch_labels = true
csharp_indent_labels = one_less_than_current
csharp_space_after_cast = false
csharp_space_after_keywords_in_control_flow_statements = true
csharp_space_between_method_declaration_parameter_list_parentheses = false
csharp_space_between_method_call_parameter_list_parentheses = false
csharp_space_around_binary_operators = before_and_after
dotnet_style_operator_placement_when_wrapping = beginning_of_line

# Uma instrução por linha; nunca mais de uma linha em branco seguida
csharp_preserve_single_line_statements = false
csharp_preserve_single_line_blocks = true
csharp_style_allow_embedded_statements_on_same_line_experimental = false
dotnet_style_allow_multiple_blank_lines_experimental = false

# Nomes: constante em PascalCase
dotnet_naming_symbols.constantes.applicable_kinds = field
dotnet_naming_symbols.constantes.required_modifiers = const
dotnet_naming_style.pascal_case.capitalization = pascal_case
dotnet_naming_rule.constantes_em_pascal_case.symbols = constantes
dotnet_naming_rule.constantes_em_pascal_case.style = pascal_case
dotnet_naming_rule.constantes_em_pascal_case.severity = warning

# Nomes: campo estático private ou internal em s_camelCase
dotnet_naming_symbols.campos_estaticos.applicable_kinds = field
dotnet_naming_symbols.campos_estaticos.applicable_accessibilities = private, internal, private_protected
dotnet_naming_symbols.campos_estaticos.required_modifiers = static
dotnet_naming_style.prefixo_s.required_prefix = s_
dotnet_naming_style.prefixo_s.capitalization = camel_case
dotnet_naming_rule.campos_estaticos_com_s.symbols = campos_estaticos
dotnet_naming_rule.campos_estaticos_com_s.style = prefixo_s
dotnet_naming_rule.campos_estaticos_com_s.severity = warning

# Nomes: campo de instância private ou internal em _camelCase
dotnet_naming_symbols.campos_privados.applicable_kinds = field
dotnet_naming_symbols.campos_privados.applicable_accessibilities = private, internal, private_protected
dotnet_naming_style.prefixo_sublinhado.required_prefix = _
dotnet_naming_style.prefixo_sublinhado.capitalization = camel_case
dotnet_naming_rule.campos_privados_com_sublinhado.symbols = campos_privados
dotnet_naming_rule.campos_privados_com_sublinhado.style = prefixo_sublinhado
dotnet_naming_rule.campos_privados_com_sublinhado.severity = warning

# Nomes: interface com prefixo I
dotnet_naming_symbols.interfaces.applicable_kinds = interface
dotnet_naming_style.prefixo_i.required_prefix = I
dotnet_naming_style.prefixo_i.capitalization = pascal_case
dotnet_naming_rule.interfaces_com_i.symbols = interfaces
dotnet_naming_rule.interfaces_com_i.style = prefixo_i
dotnet_naming_rule.interfaces_com_i.severity = warning

# Nomes: parâmetro de tipo com prefixo T
dotnet_naming_symbols.parametros_de_tipo.applicable_kinds = type_parameter
dotnet_naming_style.prefixo_t.required_prefix = T
dotnet_naming_style.prefixo_t.capitalization = pascal_case
dotnet_naming_rule.parametros_de_tipo_com_t.symbols = parametros_de_tipo
dotnet_naming_rule.parametros_de_tipo_com_t.style = prefixo_t
dotnet_naming_rule.parametros_de_tipo_com_t.severity = warning

# Nomes: tipos e membros em PascalCase
dotnet_naming_symbols.tipos_e_membros.applicable_kinds = namespace, class, struct, enum, delegate, property, method, event, local_function
dotnet_naming_rule.tipos_e_membros_em_pascal_case.symbols = tipos_e_membros
dotnet_naming_rule.tipos_e_membros_em_pascal_case.style = pascal_case
dotnet_naming_rule.tipos_e_membros_em_pascal_case.severity = warning

# Nomes: variável local em camelCase
dotnet_naming_symbols.locais.applicable_kinds = local
dotnet_naming_style.camel_case.capitalization = camel_case
dotnet_naming_rule.locais_em_camel_case.symbols = locais
dotnet_naming_rule.locais_em_camel_case.style = camel_case
dotnet_naming_rule.locais_em_camel_case.severity = warning

# Severidade das regras de estilo
dotnet_diagnostic.IDE0003.severity = warning
dotnet_diagnostic.IDE0005.severity = warning
dotnet_diagnostic.IDE0007.severity = suggestion
dotnet_diagnostic.IDE0011.severity = suggestion
dotnet_diagnostic.IDE0019.severity = suggestion
dotnet_diagnostic.IDE0020.severity = suggestion
dotnet_diagnostic.IDE0036.severity = warning
dotnet_diagnostic.IDE0040.severity = warning
dotnet_diagnostic.IDE0041.severity = suggestion
dotnet_diagnostic.IDE0044.severity = warning
dotnet_diagnostic.IDE0049.severity = warning
dotnet_diagnostic.IDE0055.severity = warning
dotnet_diagnostic.IDE0063.severity = suggestion
dotnet_diagnostic.IDE0065.severity = warning
dotnet_diagnostic.IDE0066.severity = suggestion
dotnet_diagnostic.IDE0078.severity = suggestion
dotnet_diagnostic.IDE0083.severity = suggestion
dotnet_diagnostic.IDE0090.severity = suggestion
dotnet_diagnostic.IDE0150.severity = suggestion
dotnet_diagnostic.IDE0161.severity = warning
dotnet_diagnostic.IDE0290.severity = suggestion
dotnet_diagnostic.IDE0300.severity = suggestion
dotnet_diagnostic.IDE0301.severity = suggestion
dotnet_diagnostic.IDE0305.severity = suggestion
dotnet_diagnostic.IDE1006.severity = warning
dotnet_diagnostic.IDE2000.severity = warning
dotnet_diagnostic.IDE2001.severity = warning

# Classe concreta sem herdeiro é sealed
dotnet_diagnostic.CA1852.severity = warning

# nameof em vez de texto literal
dotnet_diagnostic.CA1507.severity = warning

# Guarda de argumento pelo método estático do framework
dotnet_diagnostic.CA1510.severity = warning
dotnet_diagnostic.CA1511.severity = warning
dotnet_diagnostic.CA1512.severity = warning
dotnet_diagnostic.CA1513.severity = warning

# Comparação de texto explícita, sem depender da cultura do servidor
dotnet_diagnostic.CA1307.severity = warning
dotnet_diagnostic.CA1309.severity = warning
dotnet_diagnostic.CA1310.severity = warning
dotnet_diagnostic.CA1311.severity = warning

# Coleção em API pública só para leitura
dotnet_diagnostic.CA1002.severity = warning
dotnet_diagnostic.CA2227.severity = warning

# Async de ponta a ponta; sem ConfigureAwait
dotnet_diagnostic.CA1849.severity = warning
dotnet_diagnostic.CA2007.severity = none

# CancellationToken por último e sempre repassado
dotnet_diagnostic.CA1068.severity = warning
dotnet_diagnostic.CA2016.severity = warning

# Comentário XML em todo tipo e membro public ou protected, com cref válido
dotnet_diagnostic.CS1591.severity = warning
dotnet_diagnostic.CS1573.severity = warning
dotnet_diagnostic.CS1572.severity = warning
dotnet_diagnostic.CS1574.severity = warning

# Log: template constante, placeholder nomeado em PascalCase e um argumento por placeholder
dotnet_diagnostic.CA1848.severity = none
dotnet_diagnostic.CA1727.severity = warning
dotnet_diagnostic.CA2254.severity = warning
dotnet_diagnostic.CA2253.severity = warning
dotnet_diagnostic.CA2017.severity = warning

# Classes que validam no construtor não usam construtor primário: aplique só aos arquivos delas
# [<pasta das classes que validam no construtor>/**.cs]
# csharp_style_prefer_primary_constructors = false

# Teste não leva comentário XML: aplique só aos arquivos dos testes
# [<pasta dos testes>/**.cs]
# dotnet_diagnostic.CS1591.severity = none
```

Sem analisador nativo, conferidos na revisão de código: comentário `//` e `/* */`, o `!` (null-forgiving), o idioma dos nomes, as siglas em PascalCase, o sufixo `Async`, o limite de 120 colunas, a ordem dos membros, a linha em branco antes do `return`, o texto das mensagens, `DateTime.Now` e `DateTime.UtcNow` fora do `TimeProvider`, `.Result`, `.Wait()` e `async void`.

## Propriedades do projeto

As regras de estilo (`IDE*`) e de comentário XML (`CS1591`, `CS1573`) só valem no build com estas duas propriedades, no `Directory.Build.props` da raiz da solução (ou em cada `.csproj`):

```xml
<Project>
  <PropertyGroup>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
  </PropertyGroup>
</Project>
```

- `EnforceCodeStyleInBuild`: executa as regras `IDE*` no `dotnet build`, e não só no editor.
- `GenerateDocumentationFile`: gera o XML de documentação; sem ele, o `CS1591`, o `CS1573` e o `IDE0005` (`using` sem uso) não disparam no build.
