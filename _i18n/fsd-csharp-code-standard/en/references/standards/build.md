# Build enforcement

## `.editorconfig`

The `.editorconfig` sits at the solution root. The options define the preference; each rule's severity goes in `dotnet_diagnostic.<ID>.severity`, which is the form honored in the build.

```ini
root = true

[*]
charset = utf-8
end_of_line = crlf
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.{csproj,props,targets,json,slnx}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.cs]

# 120-column limit (read by the editor; the compiler does not check it)
max_line_length = 120

# using directives: outside the namespace, System first, separated groups
dotnet_sort_system_directives_first = true
dotnet_separate_import_directive_groups = true
csharp_using_directive_placement = outside_namespace

# File-scoped namespace
csharp_style_namespace_declarations = file_scoped

# Explicit visibility and as the first modifier
dotnet_style_require_accessibility_modifiers = for_non_interface_members
csharp_preferred_modifier_order = public, private, protected, internal, file, static, extern, new, virtual, abstract, sealed, override, readonly, unsafe, required, volatile, async

# No this.
dotnet_style_qualification_for_field = false
dotnet_style_qualification_for_property = false
dotnet_style_qualification_for_method = false
dotnet_style_qualification_for_event = false

# Language keyword instead of the BCL type
dotnet_style_predefined_type_for_locals_parameters_members = true
dotnet_style_predefined_type_for_member_access = true

# var on every local variable with an inferred type, including var x = new T(...)
csharp_style_var_for_built_in_types = true
csharp_style_var_when_type_is_apparent = true
csharp_style_var_elsewhere = true

# new() on a field and property with the declared type; collection expression
csharp_style_implicit_object_creation_when_type_is_apparent = true
dotnet_style_prefer_collection_expression = when_types_loosely_match

# A field that does not change is readonly
dotnet_style_readonly_field = true

# Primary constructor and using declaration
csharp_style_prefer_primary_constructors = true
csharp_prefer_simple_using_statement = true

# Pattern matching and expression switch
csharp_style_prefer_pattern_matching = true
csharp_style_prefer_not_pattern = true
csharp_style_pattern_matching_over_as_with_null_check = true
csharp_style_pattern_matching_over_is_with_cast_check = true
csharp_style_prefer_switch_expression = true
csharp_style_prefer_null_check_over_type_check = true
dotnet_style_prefer_is_null_check_over_reference_equality_method = true

# Expression body when the body is a single expression; constructor always a block
csharp_style_expression_bodied_constructors = false
csharp_style_expression_bodied_methods = true
csharp_style_expression_bodied_operators = true
csharp_style_expression_bodied_local_functions = true
csharp_style_expression_bodied_properties = true
csharp_style_expression_bodied_indexers = true
csharp_style_expression_bodied_accessors = true
csharp_style_expression_bodied_lambdas = true

# Allman-style braces; no braces only on a one-line statement
csharp_prefer_braces = when_multiline
csharp_new_line_before_open_brace = all
csharp_new_line_before_else = true
csharp_new_line_before_catch = true
csharp_new_line_before_finally = true
csharp_new_line_before_members_in_object_initializers = true
csharp_new_line_before_members_in_anonymous_types = true
csharp_new_line_between_query_expression_clauses = true

# Indentation and spaces
csharp_indent_case_contents = true
csharp_indent_switch_labels = true
csharp_indent_labels = one_less_than_current
csharp_space_after_cast = false
csharp_space_after_keywords_in_control_flow_statements = true
csharp_space_between_method_declaration_parameter_list_parentheses = false
csharp_space_between_method_call_parameter_list_parentheses = false
csharp_space_around_binary_operators = before_and_after
dotnet_style_operator_placement_when_wrapping = beginning_of_line

# One statement per line; never more than one blank line in a row
csharp_preserve_single_line_statements = false
csharp_preserve_single_line_blocks = true
csharp_style_allow_embedded_statements_on_same_line_experimental = false
dotnet_style_allow_multiple_blank_lines_experimental = false

# Names: constant in PascalCase
dotnet_naming_symbols.constants.applicable_kinds = field
dotnet_naming_symbols.constants.required_modifiers = const
dotnet_naming_style.pascal_case.capitalization = pascal_case
dotnet_naming_rule.constants_in_pascal_case.symbols = constants
dotnet_naming_rule.constants_in_pascal_case.style = pascal_case
dotnet_naming_rule.constants_in_pascal_case.severity = warning

# Names: private or internal static field in s_camelCase
dotnet_naming_symbols.static_fields.applicable_kinds = field
dotnet_naming_symbols.static_fields.applicable_accessibilities = private, internal, private_protected
dotnet_naming_symbols.static_fields.required_modifiers = static
dotnet_naming_style.s_prefix.required_prefix = s_
dotnet_naming_style.s_prefix.capitalization = camel_case
dotnet_naming_rule.static_fields_with_s.symbols = static_fields
dotnet_naming_rule.static_fields_with_s.style = s_prefix
dotnet_naming_rule.static_fields_with_s.severity = warning

# Names: private or internal instance field in _camelCase
dotnet_naming_symbols.private_fields.applicable_kinds = field
dotnet_naming_symbols.private_fields.applicable_accessibilities = private, internal, private_protected
dotnet_naming_style.underscore_prefix.required_prefix = _
dotnet_naming_style.underscore_prefix.capitalization = camel_case
dotnet_naming_rule.private_fields_with_underscore.symbols = private_fields
dotnet_naming_rule.private_fields_with_underscore.style = underscore_prefix
dotnet_naming_rule.private_fields_with_underscore.severity = warning

# Names: interface with the I prefix
dotnet_naming_symbols.interfaces.applicable_kinds = interface
dotnet_naming_style.i_prefix.required_prefix = I
dotnet_naming_style.i_prefix.capitalization = pascal_case
dotnet_naming_rule.interfaces_with_i.symbols = interfaces
dotnet_naming_rule.interfaces_with_i.style = i_prefix
dotnet_naming_rule.interfaces_with_i.severity = warning

# Names: type parameter with the T prefix
dotnet_naming_symbols.type_parameters.applicable_kinds = type_parameter
dotnet_naming_style.t_prefix.required_prefix = T
dotnet_naming_style.t_prefix.capitalization = pascal_case
dotnet_naming_rule.type_parameters_with_t.symbols = type_parameters
dotnet_naming_rule.type_parameters_with_t.style = t_prefix
dotnet_naming_rule.type_parameters_with_t.severity = warning

# Names: types and members in PascalCase
dotnet_naming_symbols.types_and_members.applicable_kinds = namespace, class, struct, enum, delegate, property, method, event, local_function
dotnet_naming_rule.types_and_members_in_pascal_case.symbols = types_and_members
dotnet_naming_rule.types_and_members_in_pascal_case.style = pascal_case
dotnet_naming_rule.types_and_members_in_pascal_case.severity = warning

# Names: local variable in camelCase
dotnet_naming_symbols.locals.applicable_kinds = local
dotnet_naming_style.camel_case.capitalization = camel_case
dotnet_naming_rule.locals_in_camel_case.symbols = locals
dotnet_naming_rule.locals_in_camel_case.style = camel_case
dotnet_naming_rule.locals_in_camel_case.severity = warning

# Severity of the style rules
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

# A concrete class with no heir is sealed
dotnet_diagnostic.CA1852.severity = warning

# nameof instead of a literal text
dotnet_diagnostic.CA1507.severity = warning

# Argument guard via the framework's static method
dotnet_diagnostic.CA1510.severity = warning
dotnet_diagnostic.CA1511.severity = warning
dotnet_diagnostic.CA1512.severity = warning
dotnet_diagnostic.CA1513.severity = warning

# Explicit text comparison, without depending on the server's culture
dotnet_diagnostic.CA1307.severity = warning
dotnet_diagnostic.CA1309.severity = warning
dotnet_diagnostic.CA1310.severity = warning
dotnet_diagnostic.CA1311.severity = warning

# Collection in a public API is read-only
dotnet_diagnostic.CA1002.severity = warning
dotnet_diagnostic.CA2227.severity = warning

# Async end to end; no ConfigureAwait
dotnet_diagnostic.CA1849.severity = warning
dotnet_diagnostic.CA2007.severity = none

# CancellationToken last and always passed on
dotnet_diagnostic.CA1068.severity = warning
dotnet_diagnostic.CA2016.severity = warning

# XML comment on every public or protected type and member, with a valid cref
dotnet_diagnostic.CS1591.severity = warning
dotnet_diagnostic.CS1573.severity = warning
dotnet_diagnostic.CS1572.severity = warning
dotnet_diagnostic.CS1574.severity = warning

# Log: constant template, named placeholder in PascalCase, and one argument per placeholder
dotnet_diagnostic.CA1848.severity = none
dotnet_diagnostic.CA1727.severity = warning
dotnet_diagnostic.CA2254.severity = warning
dotnet_diagnostic.CA2253.severity = warning
dotnet_diagnostic.CA2017.severity = warning

# Classes that validate in the constructor do not use a primary constructor: apply only to their files
# [<folder of the classes that validate in the constructor>/**.cs]
# csharp_style_prefer_primary_constructors = false

# A test does not carry an XML comment: apply only to the test files
# [<tests folder>/**.cs]
# dotnet_diagnostic.CS1591.severity = none
```

With no native analyzer, checked in code review: `//` and `/* */` comments, the `!` (null-forgiving), the names in English, acronyms in PascalCase, the `Async` suffix, the 120-column limit, member order, the blank line before the `return`, message text, `DateTime.Now` and `DateTime.UtcNow` outside `TimeProvider`, `.Result`, `.Wait()`, and `async void`.

## Project properties

The style (`IDE*`) and XML comment (`CS1591`, `CS1573`) rules only apply in the build with these two properties, in the `Directory.Build.props` at the solution root (or in each `.csproj`):

```xml
<Project>
  <PropertyGroup>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
  </PropertyGroup>
</Project>
```

- `EnforceCodeStyleInBuild`: runs the `IDE*` rules in `dotnet build`, and not only in the editor.
- `GenerateDocumentationFile`: generates the documentation XML; without it, `CS1591`, `CS1573`, and `IDE0005` (unused `using`) do not fire in the build.
