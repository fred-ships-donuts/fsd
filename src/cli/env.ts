// Imported first by the CLI entry point (modules run in import order): React and Ink check NODE_ENV when they load, and
// their development build is several times slower, which shows while the window is being dragged.
process.env.NODE_ENV ??= 'production';
