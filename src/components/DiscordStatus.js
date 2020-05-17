const { ACTION } = require('../store/actions');

const template = `
<div class="discord-status">
  <el-row>
    <el-col :span="6">{{ connected }}</el-col>
    <el-col :span="6">
      <el-button-group>
        <el-button size="mini" ref="loginButton" type="primary" v-on:click="login">{{ action }}</el-button>
        <el-button size="mini" type="primary" v-on:click="setToken">Set Token</el-button>
      </el-button-group>
    </el-col>
    <el-col :span="12" class="last">
      <div class="vc">
        <div class="selector">
          <el-cascader
            :options="channels"
            v-model="selectedOptions">
          </el-cascader>
        </div>
        <div class="connect">
          <div class="green tiny-button" @click="vcConnect"><i class="el-icon-service"></i></div>
          <div class="red tiny-button" @click="vcDisconnect"><i class="el-icon-close"></i></div>
        </div>
      </div>
    </el-col>
  </el-row>
</div>
`;

module.exports = {
  id: 'discord-status',
  component: {
    template,
    data() {
     return {
       selectedOptions: []
     }
    },
    computed: {
      ready() {
        return this.$store.state.discord.ready;
      },
      connected() {
        return this.ready
          ? `Logged in as ${this.$store.state.discord.tag}`
          : 'Disconnected from Discord';
      },
      action() {
        return this.ready ? 'Disconnect' : 'Connect';
      },
      channels() {
        // format into the element cascader element
        const guilds = this.$store.state.discord.voiceChannels;
        const data = [];
        for (guild in guilds) {
          const children = guilds[guild].channels.map((ch, idx) => {
            // map by array index, the id is used for a connect op
            return { label: ch.name, value: idx };
          });

          data.push({
            value: guild,
            label: guilds[guild].name,
            children
          });
        }

        return data;
      }
    },
    methods: {
      login() {
        if (!this.ready) {
          this.$store.dispatch(ACTION.DISCORD_LOGIN);
        } else {
          this.$store.dispatch(ACTION.DISCORD_LOGOUT);
        }
      },
      setToken() {
        this.$prompt('Enter your Discord bot token.', 'Set Bot Token', {
          confirmButtonText: 'Set',
          cancelButtonText: 'Cancel',
          inputPlaceholder: this.$store.state.discord.token,
        })
          .then((value) => {
            this.$store.dispatch(ACTION.DISCORD_SET_TOKEN, value.value);
          })
          .catch(() => {
            // noop
          });
      },
      vcConnect() {
        // sanity check length of options
        if (this.selectedOptions.length !== 2) {
          console.log('channel not selected, invalid option length');
          return;
        }

        // get the channel id
        const guilds = this.$store.state.discord.voiceChannels;
        const channelInfo = guilds[this.selectedOptions[0]].channels[this.selectedOptions[1]];
        this.$store.dispatch(ACTION.DISCORD_JOIN_VOICE, channelInfo);
      },
      vcDisconnect() {
        this.$store.dispatch(ACTION.DISCORD_LEAVE_VOICE);
      }
    },
  },
};
