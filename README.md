# react-cli

CLI tool for React.js

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/react-cli.svg)](https://npmjs.org/package/react-cli)
[![Downloads/week](https://img.shields.io/npm/dw/react-cli.svg)](https://npmjs.org/package/react-cli)
[![License](https://img.shields.io/npm/l/react-cli.svg)](https://github.com/DewZ89/react-cli/blob/master/package.json)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

<!-- toc -->

- [Commit Guideline](#commit-guideline)
- [Usage](#usage)
- [Commands](#commands)
- [Maintainers](#maintainers)
<!-- tocstop -->

# Commit guideline

To ensure consistent, readable commit message and automatically compute next semver version, we use **AngularJS's commit message** convention a.k.a [Conventional-changelog](https://github.com/ajoslin/conventional-changelog).
To use this convention in our commit with use the npm [Commitizen](https://github.com/commitizen/cz-cli) module. Therefore, to make a commit you must follow these steps:

1. Stage your changes, typically:

```sh-session
git add .
```

2. Run

```sh-session
yarn commit
```

3. Then, fill all the information needed

# Usage

<!-- usage -->

```sh-session
$ npm install -g react-cli
$ react COMMAND
running command...
$ react (-v|--version|version)
react-cli/0.0.0 darwin-x64 node-v14.15.1
$ react --help [COMMAND]
USAGE
  $ react COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`react hello [FILE]`](#react-hello-file)
- [`react help [COMMAND]`](#react-help-command)

## `react hello [FILE]`

describe the command here

```
USAGE
  $ react hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ react hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/DewZ89/react-cli/blob/v0.0.0/src/commands/hello.ts)_

## `react help [COMMAND]`

display help for react

```
USAGE
  $ react help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

<!-- commandsstop -->

# Maintainers

- [@DewZ89](https://github.com/dewz89)
- [@juvpengele](https://github.com/juvpengele)
