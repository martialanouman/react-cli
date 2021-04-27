import { Command } from '@oclif/command'

export default abstract class extends Command {
  async catch(err: Error) {
    return super.catch(err)
  }

  async finally(err: Error) {
    return super.finally(err)
  }
}
