// POSIX shell quoting keeps local paths literal, including spaces and apostrophes.
export function shellQuote(value) {
  return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}
export function publishCommand(repositoryPath, visibility = "public") {
  if (!repositoryPath || !["public", "private"].includes(visibility))
    throw new Error("Invalid publishing options.");
  const name = repositoryPath
    .split(/[\\/]/)
    .filter(Boolean)
    .at(-1);
  return `cd ${shellQuote(repositoryPath)} && gh repo create ${shellQuote(
    name
  )} --${visibility} --source=. --remote=origin --push`;
}
