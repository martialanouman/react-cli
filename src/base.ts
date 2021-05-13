import { Command } from '@oclif/command'
import { cursorTo, clearScreenDown } from 'readline'

export default abstract class extends Command {
  protected clearStdout() {
    const blank = '\n'.repeat(Number(process.stdout.rows))
    // eslint-disable-next-line no-console
    console.log(blank)
    cursorTo(process.stdout, 0, 0)
    clearScreenDown(process.stdout)
  }
}
