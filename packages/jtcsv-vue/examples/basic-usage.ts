/**
 * jtcsv-vue — basic usage smoke example.
 *
 * Demonstrates:
 *   1) Installing the plugin on a Vue 3 app.
 *   2) Using useCsvUpload inside a component for drag-drop + file-picker.
 *   3) Using useCsvDownload to export rows back to a CSV file.
 *
 * Run with: vite / vue-cli / your favorite Vue tooling. This file is a
 * reference snippet — it is not executed standalone by `node`.
 */

import { createApp, defineComponent, h, ref } from 'vue';
import {
  createJtcsvPlugin,
  useCsvUpload,
  useCsvDownload,
  useJtcsv,
} from 'jtcsv-vue';

// ---- Component using the composables ---------------------------------------

const DemoComponent = defineComponent({
  setup() {
    const rows = ref<any[]>([]);
    const { csvToJson } = useJtcsv();
    const { downloadCsv } = useCsvDownload();
    const upload = useCsvUpload({
      onParsed: (data) => {
        rows.value = data;
        // eslint-disable-next-line no-console
        console.log('Parsed', data.length, 'rows');
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error('CSV parse failed:', err.message);
      },
    });

    function onFileChange(event: Event) {
      const target = event.target as HTMLInputElement;
      void upload.handleFiles(target.files);
    }

    function exportRows() {
      if (rows.value.length === 0) {
        rows.value = csvToJson('name,age\nalice,30\nbob,25');
      }
      downloadCsv(rows.value, 'exported.csv');
    }

    return () =>
      h('div', [
        h('input', {
          type: 'file',
          accept: '.csv',
          onChange: onFileChange,
        }),
        h(
          'div',
          {
            onDragover: upload.onDragOver,
            onDragleave: upload.onDragLeave,
            onDrop: upload.onDrop,
            style: 'border:1px dashed #999; padding:1rem; margin-top:0.5rem;',
          },
          upload.isDragging.value
            ? 'Drop the CSV file…'
            : upload.isParsing.value
            ? 'Parsing…'
            : 'Or drop a CSV file here',
        ),
        h('p', `Parsed rows: ${rows.value.length}`),
        h('button', { onClick: exportRows }, 'Download CSV'),
      ]);
  },
});

// ---- Bootstrap --------------------------------------------------------------

const app = createApp(DemoComponent);
app.use(createJtcsvPlugin({ async: true }));
// In a real Vue app: app.mount('#app');
// Here we just export the configured app for the docs build.
export default app;
