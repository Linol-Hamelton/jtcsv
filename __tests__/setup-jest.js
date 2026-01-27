const util = require('util');

if (!global.TextDecoder && util.TextDecoder) {
  global.TextDecoder = util.TextDecoder;
}

if (!global.TextEncoder && util.TextEncoder) {
  global.TextEncoder = util.TextEncoder;
}

if (!global.TransformStream) {
  try {
    const webStreams = require('stream/web');
    if (webStreams.TransformStream) {
      global.TransformStream = webStreams.TransformStream;
    }
    if (!global.ReadableStream && webStreams.ReadableStream) {
      global.ReadableStream = webStreams.ReadableStream;
    }
    if (!global.WritableStream && webStreams.WritableStream) {
      global.WritableStream = webStreams.WritableStream;
    }
  } catch (error) {
    // Optional in test env; tests will fail if required and missing.
  }
}
