import { flags } from '@oclif/command'
import Command from '../base'
import * as inquirer from 'inquirer'
import { ChildProcess, spawn } from 'child_process'
import cli from 'cli-ux'

import type { Bundler, PackageManager, PrettierConfigSet } from '../types/create'
import { PACKAGE_MANAGER_FLAG_OPTIONS, BUNDLER_FLAG_OPTIONS, PRETTIER_CONFIG_SET } from '../constants'

const INVALID_APP_NAME_ERROR = 'Application name must contains only letters, numbers and dashes'

export default class Create extends Command {
  static description = 'Initialize a new React.js application'

  static examples = [
    'react create <appName>',
    'react create <appName> --bundler webpack --pkg yarn --prettier --prettier-config flexible --ts',
    'react create <appName> --bundler snowpack',
  ]

  static flags = {
    bundler: flags.string({ char: 'b', description: 'Application bundler', options: BUNDLER_FLAG_OPTIONS }),
    pkg: flags.string({
      char: 'p',
      description: 'Package manager to use',
      options: PACKAGE_MANAGER_FLAG_OPTIONS,
    }),
    prettier: flags.boolean({ description: 'Use prettier code formatter', default: undefined }),
    'prettier-config': flags.string({
      description: 'Prettier config to use',
      dependsOn: ['prettier'],
      options: PRETTIER_CONFIG_SET,
    }),
    ts: flags.boolean({ char: 't', description: 'Use TypeScript', default: undefined }),
  }

  static args = [{ name: 'name', description: 'Application name' }]

  async run() {
    const { args, flags } = this.parse(Create)
    let { bundler, pkg, prettier, 'prettier-config': prettierConfig, ts } = flags
    let { name } = args

    name = await this.handleName(name)

    bundler = await this.handleBundler(bundler)

    ts = await this.handleTypeScript(ts)

    pkg = await this.handlePackageManager(pkg)

    prettier = await this.handlePrettier(prettier)

    prettierConfig = await this.handlePrettierConfig(prettier, prettierConfig)

    const response = await inquirer.prompt({
      name: 'confirm',
      type: 'confirm',
      message: `You are about to create a new React app named "${name}" and powered by ${bundler} bundler. Proceed?`,
      default: true,
    })

    if (response.confirm) {
      cli.action.start(`Creating app...`)

      this.createApp({
        name,
        pkg: pkg as PackageManager,
        bundler: bundler as Bundler,
        prettier,
        prettierConfig: prettierConfig as PrettierConfigSet,
        ts,
      })
    } else {
      this.log('App creation cancelled')
    }
  }

  private async handlePrettierConfig(prettier: boolean, prettierConfig: string | undefined) {
    if (prettier) {
      const response = await inquirer.prompt({
        name: 'prettierConfig',
        message: 'Choose a prettier config set',
        type: 'list',
        choices: [
          { name: 'Flexible', value: 'flexible', short: 'Flexible code formatting' },
          { name: 'Strict', value: 'strict', short: 'Strict code formatting' },
        ],
      })
      prettierConfig = response.prettierConfig
    }
    return prettierConfig
  }

  private async handlePrettier(prettier: boolean) {
    if (prettier === undefined) {
      const response = await inquirer.prompt({
        name: 'prettier',
        message: 'Do you want to add Prettier code formatter config?',
        type: 'confirm',
      })
      prettier = response.prettier
    }
    return prettier
  }

  private async handlePackageManager(pkg: string | undefined) {
    if (!pkg) {
      const response = await inquirer.prompt({
        name: 'pkg',
        message: 'Choose a package manager',
        type: 'list',
        default: 'yarn',
        choices: [
          { name: 'Yarn', value: 'yarn', short: 'Yarn' },
          { name: 'NPM', value: 'npm', short: 'NPM' },
        ],
      })
      pkg = response.pkg
    }
    return pkg
  }

  private async handleTypeScript(ts: boolean) {
    if (ts === undefined) {
      const response = await inquirer.prompt({
        name: 'ts',
        message: 'Do you want use TypeScript?',
        type: 'confirm',
      })
      ts = response.ts
    }
    return ts
  }

  private async handleBundler(bundler: string | undefined) {
    if (!bundler) {
      const response = await inquirer.prompt({
        name: 'bundler',
        message: 'Choose a web bundler',
        type: 'list',
        choices: [
          { name: 'Webpack', value: 'webpack', short: 'Webpack' },
          { name: 'Snowpack', value: 'snowpack', short: 'Snowpack' },
        ],
      })
      bundler = response.bundler
    }
    return bundler
  }

  private async handleName(name: string | undefined) {
    if (name && !this.isAppNameValid(name)) this.error(INVALID_APP_NAME_ERROR)

    if (!name) {
      const response = await inquirer.prompt({
        name: 'name',
        message: 'What is your application name?',
        type: 'input',
        validate: (input) => {
          if (!this.isAppNameValid(input)) return INVALID_APP_NAME_ERROR

          return true
        },
      })
      name = response.name
    }

    return name
  }

  private isAppNameValid(name: string) {
    return Boolean(/^([0-9a-zA-Z-])*$/gi.test(name))
  }

  private createApp(options: {
    name: string
    bundler: Bundler
    pkg: PackageManager
    prettier: boolean
    prettierConfig: PrettierConfigSet
    ts: boolean
  }) {
    const { name, bundler, pkg, prettier, prettierConfig, ts } = options

    if (bundler === 'webpack') {
      this.createWebpackApp({ name, pkg, ts })
    }

    if (bundler === 'snowpack') {
      this.createSnowpackApp({ name, pkg, ts })
    }
  }

  private createWebpackApp(options: { name: string; ts: boolean; pkg: PackageManager }) {
    const { name, pkg, ts } = options
    const createCommandOptions = ['create-react-app', name]
    if (ts) createCommandOptions.push('--template', 'typescript')
    if (pkg === 'npm') createCommandOptions.push('--use-npm')

    this.handleProcess(spawn('npx', createCommandOptions))
  }

  private createSnowpackApp(options: { name: string; ts: boolean; pkg: PackageManager }) {
    cli.action.stop('Not implemented')
  }

  private handleProcess(child: ChildProcess) {
    // child.stdout.on('data', (data) => this.log(data.toString()))
    child.stderr.on('data', (data) => this.warn(data.toString()))
    child.on('exit', () => cli.action.stop('Done. Enjoy!'))
  }
}
