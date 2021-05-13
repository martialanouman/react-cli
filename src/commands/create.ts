import { flags } from '@oclif/command'
import Command from '../base'
import * as inquirer from 'inquirer'
import cli from 'cli-ux'
import { writeFileSync } from 'fs'

import { execSync } from '../process'
import type { Bundler, PackageManager } from '../types/create'
import {
  PACKAGE_MANAGER_FLAG_OPTIONS,
  BUNDLER_FLAG_OPTIONS,
  PRETTIER_CONFIG_SET,
} from '../constants'
import { reactRouterTemplate } from '../templates'
import { SpawnSyncReturns } from 'child_process'

const INVALID_APP_NAME_ERROR = 'Application name must contains only letters, numbers and dashes'

export default class Create extends Command {
  static description = 'Create a new React application'

  static examples = [
    'react create <appName>',
    'react create <appName> --bundler webpack --pkg yarn --prettier --ts --rps --routing',
    'react create <appName> --bundler snowpack',
  ]

  static flags = {
    bundler: flags.string({
      char: 'b',
      description: 'Application bundler',
      options: BUNDLER_FLAG_OPTIONS,
    }),
    pkg: flags.string({
      char: 'p',
      description: 'Package manager to use',
      options: PACKAGE_MANAGER_FLAG_OPTIONS,
    }),
    prettier: flags.boolean({ description: 'Use prettier code formatter', default: undefined }),
    ts: flags.boolean({ char: 't', description: 'Use TypeScript', default: undefined }),
    rps: flags.boolean({
      char: 's',
      description: 'Use recommended project structure',
      default: undefined,
    }),
    routing: flags.boolean({ char: 'r', description: 'Add routing feature', default: undefined }),
  }

  static args = [{ name: 'name', description: 'Application name', required: true }]

  async run() {
    const { flags } = this.parse(Create)
    let { bundler, pkg, prettier, ts, rps, routing } = flags

    this.clearStdout()

    bundler = await this.handleBundler(bundler)

    ts = await this.handleTypeScript(ts)

    pkg = await this.handlePackageManager(pkg)

    routing = await this.handleRouting(routing)

    prettier = await this.handlePrettier(prettier)

    rps = await this.handleUseRecommendedProjectStructure(rps)

    const confirm = await this.handleAppCreateConfirm()

    if (confirm) {
      this.createApp({
        pkg: pkg as PackageManager,
        bundler: bundler as Bundler,
        prettier,
        ts,
        rps,
        routing,
      })
    } else {
      this.log('App creation cancelled')
    }
  }

  private async handleAppCreateConfirm(): Promise<boolean> {
    const { name } = this.parse(Create).args
    const response = await inquirer.prompt({
      name: 'confirm',
      type: 'confirm',
      message: `You are about to create a new React app named "${name}". Proceed?`,
      default: true,
    })

    return response.confirm
  }

  private async handleUseRecommendedProjectStructure(rps: boolean) {
    if (rps === undefined) {
      const response = await inquirer.prompt({
        name: 'rps',
        message: 'Do you to use recommended project structure?',
        type: 'confirm',
      })
      rps = response.rps
    }
    return rps
  }

  private async handleRouting(routing: boolean) {
    if (routing === undefined) {
      const response = await inquirer.prompt({
        name: 'routing',
        message: 'Do you want to add routing feature?',
        type: 'confirm',
      })
      routing = response.routing
    }
    return routing
  }

  private async handlePrettier(prettier: boolean) {
    if (prettier === undefined) {
      const response = await inquirer.prompt({
        name: 'prettier',
        message: 'Do you want to use Prettier?',
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
    bundler: Bundler
    pkg: PackageManager
    prettier: boolean
    ts: boolean
    routing: boolean
    rps: boolean
  }) {
    cli.action.start('Creating app')

    const { bundler, pkg, prettier, ts, routing } = options
    const { name } = this.parse(Create).args

    if (bundler === 'webpack') {
      this.createWebpackApp({ name, pkg, ts })
    }

    if (bundler === 'snowpack') {
      this.createSnowpackApp({ name, pkg, ts })
    }

    cli.action.stop('Done.')

    if (routing) {
      this.installAndBootstrapRouting(pkg, ts)
    }

    if (prettier) {
      this.installAndSetPrettierConfiguration(pkg)
    }
  }

  private installAndBootstrapRouting(pkg: PackageManager, ts: boolean) {
    cli.action.start('Setting up Routing')

    this.installReactRouter(ts, pkg)
    this.addBaseRoutesComponent(ts)

    cli.action.stop('Done.')
  }

  private installReactRouter(ts: boolean, pkg: PackageManager) {
    const res = this.installPackage(pkg, ['react-router-dom'])
    if (res.status !== 0) {
      this.error(res.stderr.toString())
    }

    if (ts) {
      const res = this.installPackage(pkg, ['@types/react-router-dom'], true)
      if (res.status !== 0) {
        this.error(res.stderr.toString())
      }
    }
  }

  private addBaseRoutesComponent(ts: boolean) {
    const extension = ts ? 'tsx' : 'js'
    writeFileSync(`${this.getProjectPath()}/src/Routes.${extension}`, reactRouterTemplate, {
      encoding: 'UTF-8',
    })
  }

  private async installAndSetPrettierConfiguration(pkg: PackageManager) {
    cli.action.start('Setting Prettier up')

    this.installPrettier(pkg)
    this.addPrettierRules()

    cli.action.stop('Done.')
  }

  private installPrettier(pkg: PackageManager) {
    const options = ['prettier', 'eslint-config-prettier', 'eslint-plugin-prettier']
    const res = this.installPackage(pkg, options)
    if (res.status !== 0) {
      this.error(res.stderr.toString())
    }
  }

  private addPrettierRules() {
    const packageJson = this.parsePackageJson()

    packageJson.eslintConfig.extends.push('prettier')
    packageJson.prettier = PRETTIER_CONFIG_SET
    packageJson.scripts.lint = "eslint '*/**/*.{js,ts,tsx}' --quiet --fix"

    writeFileSync(
      `${this.getProjectPath()}/package.json`,
      JSON.stringify(packageJson, undefined, 2),
      {
        encoding: 'UTF-8',
      },
    )
  }

  private installPackage(
    pkg: PackageManager,
    mergeOptions: string[],
    dev?: boolean,
  ): SpawnSyncReturns<Buffer> {
    const installCommand = pkg === 'npm' ? 'install' : 'add'
    const devFlag = pkg === 'npm' ? '-D' : '--dev'
    const options = [installCommand, ...mergeOptions]
    if (dev) {
      options.push(devFlag)
    }

    return execSync(pkg, options, { cwd: this.getProjectPath() })
  }

  private getProjectPath() {
    const { name } = this.parse(Create).args
    const cwd = this.getCwd()
    return `${cwd}/${name}`
  }

  private parsePackageJson(): Record<string, any> {
    const packageJsonString = execSync('cat', ['package.json'], {
      cwd: this.getProjectPath(),
    }).stdout.toString()
    return JSON.parse(packageJsonString)
  }

  private getCwd(): string {
    const process = execSync('pwd')
    return process.stdout.toString().replace('\n', '')
  }

  private createWebpackApp(options: { name: string; ts: boolean; pkg: PackageManager }) {
    const { name, pkg, ts } = options

    const createCommandOptions = ['create-react-app', name]
    if (ts) createCommandOptions.push('--template', 'typescript')
    if (pkg === 'npm') createCommandOptions.push('--use-npm')

    const res = execSync('npx', createCommandOptions)
    if (res.status !== 0) {
      this.error(res.stderr.toString())
    }
  }

  private createSnowpackApp(options: { name: string; ts: boolean; pkg: PackageManager }) {
    const { name, pkg, ts } = options

    const createCommandOptions = ['create-snowpack-app', name]
    if (ts) createCommandOptions.push('--template', '@snowpack/app-template-react')
    if (pkg === 'yarn') createCommandOptions.push('--use-yarn')

    const res = execSync('npx', createCommandOptions)
    if (res.status !== 0) {
      this.error(res.stderr.toString())
    }
  }
}
