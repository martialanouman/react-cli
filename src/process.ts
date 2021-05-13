import { ChildProcess, spawn, SpawnOptions, SpawnSyncOptions, spawnSync, SpawnSyncReturns } from 'child_process'

export type ProcessHandler = {
  onData?: (data: any) => void
  onExit?: () => void
  onError?: (data: any) => void
}

export function exec(command: string, options?: string[], execOptions?: SpawnOptions): ChildProcess {
  return spawn(command, options, execOptions)
}

export function execSync(
  command: string,
  options?: string[],
  execOptions?: SpawnSyncOptions,
): SpawnSyncReturns<Buffer> {
  return spawnSync(command, options, execOptions)
}

export function handleProcess(process: ChildProcess, handler?: ProcessHandler): void {
  if (handler && handler.onData) process.stdout.on('data', handler?.onData)
  if (handler && handler.onError) process.stderr.on('data', handler?.onError)
  if (handler && handler.onExit) process.on('exit', handler?.onExit)
}
