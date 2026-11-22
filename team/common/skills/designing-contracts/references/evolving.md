# Evolving a contract

1. Add a `schema` (or `version`) field if it has none.
2. Read the old version and the new one; write only the new.
3. The migration is idempotent and tested on a real old file.
4. An unknown newer version is refused with a clear error, never guessed.
5. Deprecate before removing; say it in the changelog.
