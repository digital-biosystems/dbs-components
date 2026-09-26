import { Webllmchat } from '../src/webllmchat/webllmchat.js';
import * as webllm from '@mlc-ai/web-llm';

jest.mock('marked', () => ({
  marked: { parse: jest.fn((s) => `<p>${s}</p>`) },
}));

jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: jest.fn((s) => String(s).replace(/<script>.*?<\/script>/g, '').replace(/<(b|i|em|strong)>(.*?)<\/\1>/g, '$2')) },
}));

jest.mock('@mlc-ai/web-llm', () => {
  const MLCEngine = jest.fn().mockImplementation(() => ({
    setInitProgressCallback: jest.fn(),
    setAppConfig: jest.fn(),
    reload: jest.fn().mockResolvedValue(undefined),
    chat: { completions: { create: jest.fn() } },
    getMessage: jest.fn().mockResolvedValue('final answer'),
    runtimeStatsText: jest.fn().mockResolvedValue('stats'),
  }));
  return {
    MLCEngine,
    prebuiltAppConfig: {
      model_list: [
        { model_id: 'Qwen3.5-0.8B-q4f16_1-MLC' },
        { model_id: 'Llama-3-8B-q4f16_1-MLC' },
      ],
    },
  };
});

function makeChat(overrides = {}) {
  const c = Object.create(Webllmchat.prototype);
  Object.assign(c, {
    modelClass: undefined,
    temperature: 0.5,
    topP: 0.9,
    systemPrompt: 'sys',
    memorySize: 128,
    messages: [],
    availableModels: [],
    selectedModel: '',
    chatMessages: [],
    chatbox: { scrollTop: 0, scrollHeight: 100 },
    engine: null,
    userinput: '',
    isdisabled: false,
  }, overrides);
  return c;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  webllm.MLCEngine.mockClear();
});

afterEach(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

describe('Webllmchat.bound', () => {
  it('lists models and filters by modelClass', () => {
    const c = makeChat({ modelClass: 'Qwen' });
    c.bound();
    expect(c.availableModels).toEqual(['Qwen3.5-0.8B-q4f16_1-MLC']);
    expect(c.selectedModel).toBe('Qwen3.5-0.8B-q4f16_1-MLC');
    expect(webllm.MLCEngine).toHaveBeenCalled();
    expect(c.isdisabled).toBe(true);
  });

  it('keeps all models without filter and coerces string params', () => {
    const c = makeChat({ modelClass: '', temperature: '0.7', topP: '0.8' });
    c.bound();
    expect(c.availableModels).toHaveLength(2);
    expect(c.temperature).toBe(0.7);
    expect(c.topP).toBe(0.8);
  });

  it('updateEngineInitProgressCallback computes clamped percent', () => {
    const c = makeChat();
    c.updateEngineInitProgressCallback({ progress: '0.5', text: 'half' });
    expect(c.progressPercent).toBe(50);
    expect(c.reporttext).toBe('half');
    c.updateEngineInitProgressCallback({ progress: '2', text: 'over' });
    expect(c.progressPercent).toBe(100);
  });
});

describe('Webllmchat.onMessageSend', () => {
  it('returns early on empty input', () => {
    const c = makeChat({ userinput: '   ' });
    c.streamingGenerating = jest.fn();
    c.onMessageSend();
    expect(c.messages).toEqual([]);
    expect(c.streamingGenerating).not.toHaveBeenCalled();
  });

  it('pushes user message plus typing placeholder and streams', () => {
    const c = makeChat({ userinput: 'hello' });
    c.streamingGenerating = jest.fn();
    c.onMessageSend();
    expect(c.messages).toEqual([{ role: 'user', content: 'hello' }]);
    expect(c.chatMessages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(c.chatMessages[1].html).toBe('typing...');
    expect(c.isdisabled).toBe(true);
    expect(c.streamingGenerating).toHaveBeenCalledWith(c.messages);
    expect(c.userinput).toBe('');
  });
});

describe('Webllmchat.appendMessage / updateLastMessage', () => {
  it('sanitizes user html but keeps assistant raw', () => {
    const c = makeChat();
    c.appendMessage({ role: 'user', content: '<b>hi</b><script>x</script>' });
    expect(c.chatMessages[0].html).not.toContain('<b>');
    expect(c.chatMessages[0].html).toContain('hi');
    c.appendMessage({ role: 'assistant', content: '**bold**' });
    expect(c.chatMessages[1].html).toBe('**bold**');
  });

  it('renders <think> blocks into reasoning divs', async () => {
    const c = makeChat();
    c.appendMessage({ role: 'assistant', content: 'typing...' });
    c.updateLastMessage('<think>reasoning here</think>final');
    await Promise.resolve();
    const html = c.chatMessages[c.chatMessages.length - 1].html;
    expect(html).toContain('reasoning-block');
    expect(html).toContain('reasoning here');
    expect(html).toContain('final');
  });

  it('onFinishGenerating re-enables input and sets stats', async () => {
    const c = makeChat({ isdisabled: true });
    c.appendMessage({ role: 'assistant', content: 'typing...' });
    c.engine = { runtimeStatsText: jest.fn().mockResolvedValue('1 tok/s') };
    c.onFinishGenerating('done');
    await Promise.resolve();
    await Promise.resolve();
    expect(c.isdisabled).toBe(false);
    expect(c.statsText).toBe('1 tok/s');
    expect(c.chatclass).toBe('chat-stats');
  });
});

describe('Webllmchat.streamingGenerating', () => {
  it('composes system + recent window + dev cue + current, streams deltas', async () => {
    const c = makeChat({ memorySize: 1, systemPrompt: 'sys' });
    const old = Array.from({ length: 6 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}`,
    }));
    const current = { role: 'user', content: 'now?' };
    const raw = [...old, current];
    async function* chunks() {
      yield { choices: [{ delta: { content: 'hel' } }] };
      yield { choices: [{ delta: { content: 'lo' } }] };
    }
    let sentMessages = null;
    c.engine = {
      chat: { completions: { create: jest.fn(async (arg) => { sentMessages = arg.messages; return chunks(); }) } },
      getMessage: jest.fn().mockResolvedValue('hello'),
    };
    c.chatMessages = [{ role: 'assistant', html: 'typing...' }];
    c.onFinishGenerating = jest.fn();
    await c.streamingGenerating(raw);
    // system first, current last, window capped to N*2=2 recent + dev cue
    expect(sentMessages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(sentMessages[sentMessages.length - 1]).toEqual(current);
    expect(sentMessages.length).toBe(1 + 2 + 1 + 1);
    expect(c.onFinishGenerating).toHaveBeenCalledWith('hello');
  });
});
