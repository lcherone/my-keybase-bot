const path = require('path')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const bot = new(require('keybase-bot'))()
const env = require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
})

if (env.error) {
  throw env.error
}

/**
 *
 */
async function main() {
  try {
    const username = process.env.KB_USERNAME
    const paperkey = process.env.KB_PAPERKEY

    await bot.init(username, paperkey)

    /**
     *
     */
    const info = bot.myInfo()
    // bot.wallet.balances().then(accounts => console.log(accounts))
    console.log(`Echo bot initialized with username ${info.username}.`)

    /**
     *
     */
    await bot.chat.clearCommands().then(async () => {
      await bot.chat.advertiseCommands({
        advertisements: [{
          type: 'public',
          commands: [{
            name: 'echo',
            description: 'Sends out your message to the current channel..boring!',
            usage: '[your text]',
          }, {
            name: 'banter',
            description: 'Random code banter.',
            usage: ``
          }, {
            name: 'js',
            description: 'run javascript.',
            usage: `[your javascript]`,
          }, {
            name: 're',
            description: 'Reply thesaurized sentence.',
            usage: `[your text]`,
          }, {
            name: 'message-count',
            description: 'Get total chat messages sent.',
            usage: ``
          }]
        }]
      })
    })

    /**
     *
     * @param {*} message
     */
    const onMessage = async message => {

      //
      if (message.content && message.content.type !== 'text') {
        return
      }

      // !banter
      if (message.content.text.body.startsWith('!message-count')) {
        bot.chat.send(message.conversationId, {
          body: message.id + ' messages have been sent between ' + message.channel.name
        })
        return
      }

      // !banter
      if (message.content.text.body.startsWith('!banter')) {
        const banterer = require("banterer")

        bot.chat.send(message.conversationId, {
          body: banterer.random()
        })
        return
      }

      // !re thesaurize the sentence
      if (message.content.text.body.startsWith('!re ')) {
        if (message.content.text.body.substr(4).length) {
          let thesaurize = require("thesaurize")
          bot.chat.send(message.conversationId, {
            body: thesaurize(message.content.text.body.substr(4))
          })
        } else {
          bot.chat.send(message.conversationId, {
            body: 'Too short, try again. Usage is !re hello world'
          })
        }
        return
      }

      // !echo
      if (message.content.text.body.startsWith('!echo ')) {
        bot.chat.send(message.conversationId, {
          body: `Whats that you say?.. \n_"` + message.content.text.body.substr(6) + `".._\nWell indeed, thats what you said.`,
        })
        bot.chat.react(message.conversationId, message.id, ':the_horns:')
        return
      }

      // !js (1 + 1) / 2 + 1
      if (message.content.text.body.startsWith('!js ')) {
        const vm = require("vm")
        try {
          let result = vm.runInNewContext(message.content.text.body.substr(4), {
            setTimeout,
            send: function (fn) {
              bot.chat.send(message.conversationId, {
                body: fn()
              })
            }
          }, {
            filename: 'script.js',
            lineOffset: 1,
            columnOffset: 1,
            displayErrors: true,
            timeout: 1000
          })

          if (typeof result !== 'undefined') {
            bot.chat.send(message.conversationId, {
              body: '```\n' + result + '\n```'
            })
          }
        } catch (e) {
          // Exception thrown after 1000ms
          bot.chat.send(message.conversationId, {
            body: '```\n' + e.message + '\n```'
          })
        }
      }

      // message from self
      if (info.username === message.sender.username) {

        // !file attach a file
        if (message.content.text.body.startsWith('!file ')) {
          const fs = require("fs")
          if (fs.existsSync('./files/' + message.content.text.body.substr(6))) {
            bot.chat.attach(message.channel, './files/' + message.content.text.body.substr(6), {
              title: 'The requested file ./files/' + message.content.text.body.substr(6)
            })
          } else {
            bot.chat.send(message.conversationId, {
              body: 'Error: ./files/' + message.content.text.body.substr(6) + ' was not found!'
            })
          }
          return
        }

        // !file attach a file
        if (message.content.text.body.startsWith('!readfile ')) {
          const fs = require("fs")
          if (fs.existsSync('./files/' + message.content.text.body.substr(10))) {
            try {
              const {
                spawn
              } = require('child_process')

              const ls = spawn('bash', ['-c', 'cat ./files/' + message.content.text.body.substr(10)])

              let buffer = ``

              const onData = function (data) {
                if (data) {
                  buffer += data.toString()
                }
              }
              ls.stdout.on('data', onData)
              ls.stderr.on('data', onData)

              ls.on('close', () => {
                bot.chat.send(message.conversationId, {
                  body: '```\n' + buffer.substr(0, 6950) + '```'
                })
              })
            } catch (e) {
              bot.chat.send(message.conversationId, {
                body: '```Error: ' + e.message
              })
            }
          } else {
            bot.chat.send(message.conversationId, {
              body: 'Error: ./files/' + message.content.text.body.substr(10) + ' was not found!'
            })
          }
          return
        }

        // !exec ls -la
        if (message.content.text.body.startsWith('!exec ')) {
          try {
            const {
              stdout,
              stderr
            } = await exec(message.content.text.body.substr(6))
            if (stdout) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stdout + '\n```'
              })
            }
            if (stderr) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stderr + '\n```'
              })
            }

          } catch (e) {}
        }

        // !exec2 ls -la
        if (message.content.text.body.startsWith('!exec2 ')) {
          try {
            const {
              spawn
            } = require('child_process')

            const ls = spawn('bash', ['-c', message.content.text.body.substr(7)])

            let buffer = ``

            const onData = function (data) {
              if (data) {
                buffer += data.toString()
              }
            }
            ls.stdout.on('data', onData)
            ls.stderr.on('data', onData)

            ls.on('close', code => {
              bot.chat.send(message.conversationId, {
                body: '```\n' + buffer.substr(0, 6950) + '```'
              }).then(() => {
                bot.chat.send(message.conversationId, {
                  body: `Done: Command exited with code ${code}`
                })
              })
            })
          } catch (e) {
            bot.chat.send(message.conversationId, {
              body: '```Error: ' + e.message
            })
          }
        }

        //
        if (message.content.text.body.startsWith('!lxc ')) {
          try {
            const {
              stdout,
              stderr
            } = await exec('lxc ' + message.content.text.body.substr(5))
            if (stdout) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stdout + '\n```'
              })
            }
            if (stderr) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stderr + '\n```'
              })
            }

          } catch (e) {
            bot.chat.send(message.conversationId, {
              body: '```\n' + e.message + '\n```'
            })
          }
        }

        //
        if (message.content.text.body.startsWith('!whois ')) {
          try {
            const {
              stdout,
              stderr
            } = await exec('whois ' + message.content.text.body.substr(7))
            if (stdout) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stdout + '\n```'
              })
            }
            if (stderr) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stderr + '\n```'
              })
            }

          } catch (e) {}
        }

        //
        if (message.content.text.body.startsWith('!harvest ')) {
          bot.chat.send(message.conversationId, {
            body: 'Please wait whilst scan completes, this may take a moment...'
          })
          try {
            const {
              stdout,
              stderr
            } = await exec('/usr/bin/theharvester -d ' + message.content.text.body.substr(9) + ' -l 100 -b google')
            if (stdout) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stdout + '\n```'
              })
            }
            if (stderr) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stderr + '\n```'
              })
            }
          } catch (e) {
            bot.chat.send(message.conversationId, {
              body: '```\n' + e.message + '\n```'
            })
          }
        }

        //
        if (message.content.text.body.startsWith('!scan ') || message.content.text.body.startsWith('!nmap ')) {
          bot.chat.send(message.conversationId, {
            body: 'Please wait whilst scan completes, this may take a moment...'
          })
          try {
            const {
              stdout,
              stderr
            } = await exec('nmap -p 1-10000 ' + message.content.text.body.substr(6))
            if (stdout) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stdout + '\n```'
              })
            }
            if (stderr) {
              bot.chat.send(message.conversationId, {
                body: '```\n' + stderr + '\n```'
              })
            }

          } catch (e) {
            bot.chat.send(message.conversationId, {
              body: '```\n' + e.message + '\n```'
            })
          }
        }
        return
      }
      // messages from others
      else {

        // reactions with some emojis

        if (message.content.text.body.includes('alian') || message.content.text.body.includes('ufo')) {
          bot.chat.react(message.conversationId, message.id, ':alien:')
        }

        if (message.content.text.body.includes('its shit')) {
          bot.chat.react(message.conversationId, message.id, ':poop:')
        }

        if (message.content.text.body.includes('load shedding')) {
          bot.chat.react(message.conversationId, message.id, ':poop:')
          bot.chat.react(message.conversationId, message.id, ':zap:')
        }

        if (message.content.text.body.includes('rock and roll')) {
          bot.chat.react(message.conversationId, message.id, ':the_horns:')
        }

        if (message.content.text.body.includes('will watch it') || message.content.text.body.includes('movies')) {
          bot.chat.react(message.conversationId, message.id, ':clapper:')
        }

        if (message.content.text.body.includes('money')) {
          bot.chat.react(message.conversationId, message.id, ':moneybag:')
        }

        if (message.content.text.body.includes('baby')) {
          bot.chat.react(message.conversationId, message.id, ':baby:')
        }

        if (message.content.text.body.includes('crazy')) {
          bot.chat.react(message.conversationId, message.id, ':stuck_out_tongue_winking_eye:')
        }

        if (message.content.text.body.includes('ghosts')) {
          bot.chat.react(message.conversationId, message.id, ':ghost:')
        }

        if (message.content.text.body.includes('hungry')) {
          bot.chat.react(message.conversationId, message.id, ':hamburger:')
          bot.chat.react(message.conversationId, message.id, ':fries:')
          bot.chat.react(message.conversationId, message.id, ':drooling_face:')
        }

        if (
          //message.content.text.body.includes('lol') ||
          message.content.text.body.includes('im good') // ||
          //message.content.text.body.includes('cool')
        ) {
          bot.chat.react(message.conversationId, message.id, ':+1:')
        }

        if (message.content.text.body.includes('marriage') ||
          message.content.text.body.includes('marry') ||
          message.content.text.body.includes('married')
        ) {
          bot.chat.react(message.conversationId, message.id, ':man_in_tuxedo:')
          bot.chat.react(message.conversationId, message.id, ':cupid:')
          bot.chat.react(message.conversationId, message.id, ':bride_with_veil:')
        }

        if (message.content.text.body.includes('happy')) {
          bot.chat.react(message.conversationId, message.id, ':grin:')
        }

        if (
          message.content.text.body.includes('im tired') ||
          message.content.text.body.includes('going to bed')
        ) {
          bot.chat.react(message.conversationId, message.id, ':zzz:')
        }

        if (message.content.text.body.includes('role dice')) {
          bot.chat.react(message.conversationId, message.id, ':game_die:')
          bot.chat.send(message.conversationId, {
            body: 'its.. ' + (Math.floor(Math.random() * 6) + 1),
          })
        }
      }
    }

    /**
     *
     * @param {*} e
     */
    const onError = e => console.error(e)

    /**
     *
     */
    console.log(`Listening for messages...`)
    await bot.chat.watchAllChannelsForNewMessages(onMessage, onError)
  } catch (error) {
    console.error(error)
  }
}

/**
 *
 */
async function shutDown() {
  await bot.deinit()
  process.exit()
}

process.on('SIGINT', shutDown)
process.on('SIGTERM', shutDown)

main()
