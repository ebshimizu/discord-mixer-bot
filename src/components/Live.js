const template = `
<div id="live">
  <div class="title">Live</div>
  <div class="sources">
    <audio-source
      v-for="source in sources"
      v-bind:source="source"
      v-bind:key="source.id">
    </audio-source>
  </div>
</div>
`

module.exports = {
  id: 'live',
  component: {
    template,
    computed: {
      sources() {
        return this.$store.state.audio.live;
      }
    }
  }
}