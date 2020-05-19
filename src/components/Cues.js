const template = `
<div id="cues">
  <div class="title">Cues</div>
  <div class="cues">
    <el-tree
      :data="cueTree"
      :render-content="renderCue"
      :props="defaultProps">
    </el-tree>
  </div>
</div>
`;

module.exports = {
  id: 'cues',
  component: {
    template,
    data() {
      return {
        defaultProps: {
          children: 'children',
          label: 'label',
        },
      };
    },
    computed: {
      cueTree() {
        // collect by category
        const cues = this.$store.state.cues;
        const categories = {};
        for (const id in cues) {
          const cue = cues[id];
          if (!(cue.category in categories)) {
            categories[cue.category] = [];
          }

          categories[cue.category].push({ cue, id });
        }

        // format into element array
        return Object.keys(categories).map((name) => {
          return {
            label: name,
            children: categories[name].map((cue) => {
              return { label: cue.cue.name, id: cue.id };
            }),
          };
        });
      },
    },
    methods: {
      cueInfo(id) {
        console.log(id);
        if (id in this.$store.state.cues) {
          const cue = this.$store.state.cues[id];
          console.log(cue);
          this.$alert(
            `<p>
              <strong>Category</strong>: ${cue.category}<br/>
              <strong>Fade Time</strong>: ${cue.fadeTime}s<br />
              <strong>Sources</strong>: ${cue.sources
                .map(
                  (src) =>
                    `Volume: ${(src.volume * 100).toFixed(1)} [${src.type}] ${
                      src.locator
                    }`
                )
                .join(',')}
            </p>`,
            'Cue Info',
            { confirmButtonText: 'OK', dangerouslyUseHTMLString: true }
          );
        }
      },
      renderCue(h, { node, data, store }) {
        console.log(node, data, store);

        // since i'm not using JSX, this will be somewhat painful
        const label = [h('div', {}, [node.label])];
        const leafButtons = [
          h(
            'el-dropdown',
            {
              props: {
                trigger: 'click',
                size: 'mini',
                placement: 'bottom-start',
              },
            },
            [
              h('div', { class: 'cue-dropdown' }, [node.label]),
              h('el-dropdown-menu', { props: { slot: 'dropdown' } }, [
                h('el-dropdown-item', {}, ['Edit']),
                h('el-dropdown-item', {}, ['Preload']),
                h(
                  'el-dropdown-item',
                  { nativeOn: { click: () => this.cueInfo(data.id) } },
                  ['Info']
                ),
                h('el-dropdown-item', {}, ['Unload']),
                h('el-dropdown-item', {}, ['Delete']),
              ]),
            ]
          ),
          h(
            'el-button',
            {
              props: {
                size: 'mini',
                icon: 'el-icon-d-arrow-right',
                type: 'primary',
              },
            },
            []
          ),
        ];

        return h(
          'div',
          {
            class: {
              'cue-item': true,
              header: data.children,
              leaf: !data.children,
            },
          },
          data.children ? label : leafButtons
        );
      },
    },
  },
};
