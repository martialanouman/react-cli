import { flags } from '@oclif/command'
import Command from '../base'
import * as inquirer from 'inquirer'
import cli from 'cli-ux'
import { writeFileSync } from 'fs'

import { execSync } from '../process'
import type { Bundler, PackageManager } from '../types/create'
import { PACKAGE_MANAGER_FLAG_OPTIONS, BUNDLER_FLAG_OPTIONS, PRETTIER_CONFIG_SET } from '../constants'

const INVALID_APP_NAME_ERROR = 'Application name must contains only letters, numbers and dashes'

export default class Create extends Command {
  static description = 'Initialize a new React.js application'

  static examples = [
    'react create <appName>',
    'react create <appName> --bundler webpack --pkg yarn --prettier --ts --git',
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
    ts: flags.boolean({ char: 't', description: 'Use TypeScript', default: undefined }),
  }

  static args = [{ name: 'name', description: 'Application name', required: true }]

  async run() {
    const { flags } = this.parse(Create)
    let { bundler, pkg, prettier, ts } = flags

    bundler = await this.handleBundler(bundler)

    ts = await this.handleTypeScript(ts)

    pkg = await this.handlePackageManager(pkg)

    // lint = await this.handleLint(lint)

    prettier = await this.handlePrettier(prettier)

    const confirm = await this.handleAppCreateConfirm()

    if (confirm) {
      this.createApp({
        pkg: pkg as PackageManager,
        bundler: bundler as Bundler,
        prettier,
        ts,
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

  private async handleLint(lint: boolean) {
    if (lint === undefined) {
      const response = await inquirer.prompt({
        name: 'lint',
        message: 'Do you to use ESLint?',
        type: 'confirm',
      })
      lint = response.lint
    }
    return lint
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

  private createApp(options: { bundler: Bundler; pkg: PackageManager; prettier: boolean; ts: boolean }) {
    cli.action.start('Creating app')

    const { bundler, pkg, prettier, ts } = options
    const { name } = this.parse(Create).args

    if (bundler === 'webpack') {
      this.createWebpackApp({ name, pkg, ts })
    }

    if (bundler === 'snowpack') {
      this.createSnowpackApp({ name, pkg, ts })
    }

    cli.action.stop('Done.')

    this.installAndSetPrettierConfiguration({ prettier, pkg, name })
  }

  private async installAndSetESLintConfiguration(options: { pkg: PackageManager; lint: boolean; ts: boolean }) {
    const { pkg, lint, ts } = options
    if (lint) {
      cli.action.start('Setting ESLint up')

      this.installESLint(pkg, ts)

      cli.action.stop('Done.')
    }
  }

  private installESLint(pkg: PackageManager, ts: boolean) {
    const options = ['eslint', ...(ts ? ['@typescript-eslint/parser', '@typescript-eslint/eslint-plugin'] : [])]
    this.installDev(pkg, options)
  }

  private async installAndSetPrettierConfiguration(options: { prettier: boolean; name: string; pkg: PackageManager }) {
    const { prettier, pkg } = options
    if (prettier) {
      cli.action.start('Setting Prettier up')

      this.installPrettier(pkg)

      cli.action.stop('Done.')
    }
  }

  private installPrettier(pkg: PackageManager) {
    const options = ['prettier', 'eslint-config-prettier', 'eslint-plugin-prettier']
    this.installDev(pkg, options)
    this.addPrettierRules()
  }

  private addPrettierRules() {
    const packageJson = this.parsePackageJson()

    packageJson.eslintConfig.extends.push('prettier')
    packageJson.prettier = PRETTIER_CONFIG_SET
    packageJson.scripts.lint = "eslint '*/**/*.{js,ts,tsx}' --quiet --fix"

    writeFileSync(`${this.getProjectPath()}/package.json`, JSON.stringify(packageJson, undefined, 2), {
      encoding: 'UTF-8',
    })
  }

  private installDev(pkg: PackageManager, mergeOptions: string[]) {
    const installCommand = pkg === 'npm' ? 'install' : 'add'
    const devFlag = pkg === 'npm' ? '-D' : '--dev'
    const options = [installCommand, ...mergeOptions, devFlag]

    execSync(pkg, options, { cwd: this.getProjectPath() })
  }

  private getProjectPath() {
    const { name } = this.parse(Create).args
    const cwd = this.getCwd()
    return `${cwd}/${name}`
  }

  private parsePackageJson(): Record<string, any> {
    const packageJsonString = execSync('cat', ['package.json'], { cwd: this.getProjectPath() }).stdout.toString()
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
      this.error(res.error as Error)
    }
  }

  private createSnowpackApp(_options: { name: string; ts: boolean; pkg: PackageManager }) {
    cli.action.stop('Not implemented')
  }
}
