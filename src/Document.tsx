import React from 'react';
import ReactQuill, { Quill } from 'react-quill';
import QuillMarkdown from 'quilljs-markdown';
import store from 'store';
import { Configuration, OpenAIApi } from 'openai';
import { ToastContainer, toast } from 'react-toastify';

import Config from './config';

import type { DeltaStatic as QuillDelta } from 'quill';

import 'react-quill/dist/quill.bubble.css';
import 'react-toastify/dist/ReactToastify.css';
import styles from './Document.module.css';

ReactQuill.Quill.register('modules/QuillMarkdown', QuillMarkdown);

interface DocumentProps {
  quillRef: React.MutableRefObject<ReactQuill | null>;
  quillDelta: QuillDelta | null;
  onChange: (html: string, delta: QuillDelta) => void;
}

export default function Document({ quillRef, quillDelta, onChange }: DocumentProps) {
  React.useEffect(() => {}, []);
  const handleClick = () => {
    quillRef.current?.focus();
  };

  const handleChange = (html: string) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      onChange(html, editor.getContents());
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent) => {
    if ((!event.ctrlKey && !event.metaKey) || event.key !== 'Enter') {
      return;
    }
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      return;
    }

    const range = editor.getSelection(true);
    if (!range) {
      // Not in the editor
      return;
    }

    const fullText = editor.getText();
    if (!fullText.trim()) {
      toast('Please write some text first!');
      return;
    }

    let before = fullText;
    let after = '';

    let cursorIndex = 0;
    if (range.length === 0) {
      // Cursor is here
      cursorIndex = range.index;
      before = fullText.slice(0, cursorIndex);
      after = fullText.slice(cursorIndex);
    } else {
      // TODO Handle editing
      const text = editor.getText(range.index, range.length);
      console.log('User has highlighted: ', text);
      return;
    }

    console.log(`Before: "${before}"`);
    console.log(`After: "${after}"`);

    editor.disable();
    const loadingToast = toast.loading('Generating text...');
    const configuration = new Configuration({
      apiKey: Config.OpenAI.apiKey || store.get('openAiApiKey'),
    });
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createCompletion({
      model: 'text-davinci-002',
      prompt: before.trim(),
      suffix: after.trim() ? after.trim() : undefined,
      max_tokens: Number(store.get('openAiMaxTokens')) || 256,
      temperature: Number(store.get('openAiTemperature')) || 0.7,
      best_of: 1,
      presence_penalty: 0,
    });
    toast.dismiss(loadingToast);
    editor.enable();
    const completedText = completion.data.choices[0].text;
    if (!completedText?.trim()) {
      toast.error("The AI didn't have anything to say. Try writing a bit more.", {
        hideProgressBar: true,
      });
      return;
    }
    console.log(`completion "${completedText}"`);
    const shouldAddSpace = !before.endsWith(' ') && !before.endsWith('\n');
    console.log('shouldAddSpace?', shouldAddSpace);
    editor.insertText(cursorIndex, (shouldAddSpace ? ' ' : '') + completedText.trim());
  };

  return (
    <div className={styles.container} onClick={handleClick}>
      <ReactQuill
        className={styles.editor}
        ref={quillRef}
        theme="bubble"
        value={quillDelta || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={`Start writing... then press ${
          window.navigator.platform.startsWith('Mac') ? 'Cmd' : 'Ctrl'
        }+Enter to generate text with AI`}
        modules={{
          QuillMarkdown: {},
        }}
      />
      <ToastContainer />
    </div>
  );
}
