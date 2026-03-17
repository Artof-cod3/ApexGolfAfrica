type ChatMessage = {
  from: 'bot' | 'user';
  text: string;
};

type ChatRequestBody = {
  question?: string;
  history?: ChatMessage[];
  context?: {
    product?: string;
    scope?: string;
  };
};

type SerperSearchResult = {
  title: string;
  link: string;
  snippet: string;
};

const buildSystemPrompt = () => {
  return [
    'You are ApexGolf Africa support assistant.',
    'Scope: client booking help only.',
    'Keep replies concise and practical.',
    'When web search context is provided, use it carefully and do not overstate confidence.',
    'If asked for account-specific actions, direct user to WhatsApp/email support with booking reference.',
    'Do not invent policies or pricing not present in context.',
    'If unsure, say so and provide a support escalation path.',
  ].join(' ');
};

const sanitizeHistory = (history: ChatMessage[] = []) => {
  return history
    .filter((item) => item && typeof item.text === 'string')
    .slice(-8)
    .map((item) => ({
      role: item.from === 'user' ? 'user' : 'assistant',
      content: item.text,
    }));
};

const buildPromptFromMessages = (messages: Array<{ role: string; content: string }>) => {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n');
};

const shouldUseWebSearch = (question: string) => {
  const normalized = question.toLowerCase();
  const searchTriggers = [
    'latest',
    'current',
    'today',
    'recent',
    'news',
    'website',
    'contact',
    'location',
    'directions',
    'review',
    'best',
    'near',
  ];

  return searchTriggers.some((trigger) => normalized.includes(trigger));
};

const formatSearchResults = (results: SerperSearchResult[]) => {
  if (results.length === 0) return 'No web search results found.';

  return results
    .map((result, index) => {
      return [
        `Result ${index + 1}: ${result.title}`,
        `Link: ${result.link}`,
        `Snippet: ${result.snippet}`,
      ].join('\n');
    })
    .join('\n\n');
};

const searchWithSerper = async (apiKey: string, question: string): Promise<SerperSearchResult[]> => {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      q: question,
      num: 3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serper error: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return (data.organic ?? [])
    .slice(0, 3)
    .map((item) => ({
      title: item.title?.trim() ?? 'Untitled',
      link: item.link?.trim() ?? '',
      snippet: item.snippet?.trim() ?? 'No snippet provided.',
    }))
    .filter((item) => item.link);
};

const callOpenAI = async (
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 280,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${errorText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim();
};

const callFreeTextProvider = async (messages: Array<{ role: string; content: string }>) => {
  const prompt = buildPromptFromMessages(messages);
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
  if (!response.ok) {
    throw new Error(`Free provider error: HTTP ${response.status}`);
  }

  const text = (await response.text()).trim();
  if (!text) {
    throw new Error('Free provider returned empty response');
  }

  return text;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const serperApiKey = process.env.SERPER_API_KEY;

  const body = (req.body ?? {}) as ChatRequestBody;
  const question = body.question?.trim();

  if (!question) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  const contextSummary = [
    `Product: ${body.context?.product ?? 'ApexGolf Africa'}`,
    `Scope: ${body.context?.scope ?? 'client_support'}`,
    'Support channels: WhatsApp and email from the client help widget.',
    'Booking lookup uses APX reference or booking email on the Client page.',
  ].join('\n');

  let webSearchSummary = '';
  if (serperApiKey && shouldUseWebSearch(question)) {
    try {
      const searchResults = await searchWithSerper(serperApiKey, question);
      if (searchResults.length > 0) {
        webSearchSummary = formatSearchResults(searchResults);
      }
    } catch {
      webSearchSummary = '';
    }
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'system', content: `Context:\n${contextSummary}` },
    ...(webSearchSummary ? [{ role: 'system', content: `Web search results:\n${webSearchSummary}` }] : []),
    ...sanitizeHistory(body.history),
    { role: 'user', content: question },
  ];

  try {
    let reply: string | undefined;

    if (apiKey) {
      try {
        reply = await callOpenAI(apiKey, messages);
      } catch {
        reply = await callFreeTextProvider(messages);
      }
    } else {
      reply = await callFreeTextProvider(messages);
    }

    if (!reply) {
      res.status(502).json({ error: 'Empty AI response' });
      return;
    }

    res.status(200).json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to process AI request', detail: message });
  }
}
