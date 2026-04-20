import { createInterface } from 'readline/promises';

export async function prompt(question: string, obscure = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (obscure) {
    const { emitKeypressEvents } = await import('readline');
    emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    return new Promise(resolve => {
      process.stdout.write(question);
      let value = '';
      process.stdin.on('keypress', function handler(_, key) {
        if (key.name === 'return' || key.name === 'enter') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('keypress', handler);
          process.stdout.write('\n');
          rl.close();
          resolve(value);
        } else if (key.name === 'backspace') {
          value = value.slice(0, -1);
        } else if (!key.ctrl && key.sequence) {
          value += key.sequence;
        }
      });
    });
  }

  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

// Prompts repeatedly until the user provides a non-empty value.
export async function promptRequired(question: string, obscure = false): Promise<string> {
  while (true) {
    const value = await prompt(question, obscure);
    if (value) return value;
    process.stdout.write('This field is required.\n');
  }
}

// Prompts for an optional field, returning undefined if the user presses Enter.
export async function promptOptional(question: string): Promise<string | undefined> {
  const value = await prompt(question);
  return value || undefined;
}
