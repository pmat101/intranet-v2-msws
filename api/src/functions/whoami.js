const { app } = require('@azure/functions');
const { verifyRequest } = require('../lib/auth');

app.http('whoami', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'whoami',
  handler: async (request, context) => {
    let caller;
    try {
      caller = await verifyRequest(request);
    } catch (err) {
      context.log('Rejected request:', err.code);
      return {
        status: 401,
        jsonBody: { ok: false, error: { code: err.code, message: err.message } }
      };
    }

    return {
      status: 200,
      jsonBody: { ok: true, data: caller }
    };
  }
});
