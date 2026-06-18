export function resolveByHost(hostname, configByHost) {
  const entry = Object.entries(configByHost).find(
    ([key]) => key !== "default" && hostname.endsWith(key),
  );
  return entry ? entry[1] : configByHost.default;
}
