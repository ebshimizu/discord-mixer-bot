const { ACTION } = require('../store/actions');

const template = `
<div class="audio-source">
  {{ source.id }}: {{ source.status }}
</div>
`
module.exports = {
  id: 'audio-source',
  component: {
    template,
    props: ['source'],
    methods: {}
  }
}