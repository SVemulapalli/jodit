/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2024 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

/**
 * [[include:plugins/ai-assistant/README.md]]
 * @packageDocumentation
 * @module plugins/ai-assistant
 */

import type { IDestructible, IDialog, IJodit } from 'jodit/types';
import { cache, cached } from 'jodit/core/decorators/cache/cache';
import { watch } from 'jodit/core/decorators/watch/watch';
import { extendLang, pluginSystem } from 'jodit/core/global';
import { isAbortError } from 'jodit/core/helpers/checker/is-abort-error';
import { Plugin } from 'jodit/core/plugin/plugin';

import './config';

import { UiAiAssistant } from './ui/ui-ai-assistant';
import * as langs from './langs';

/**
 * The plugin inserts content generated by AI into the editor.
 */
export class aiAssistant extends Plugin {
	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			name: 'ai-commands',
			group: 'insert'
		},
		{
			name: 'ai-assistant',
			group: 'insert'
		}
	];

	@cache
	private get __dialog(): IDialog {
		return this.jodit.dlg({
			buttons: ['fullsize', 'dialog.close'],
			closeOnClickOverlay: true,
			closeOnEsc: true,
			resizable: false,
			draggable: true,
			minHeight: 160
		});
	}

	@cache
	private get __container(): UiAiAssistant {
		const { jodit, __dialog } = this;

		return new UiAiAssistant(jodit, {
			onInsertAfter(html: string): void {
				jodit.s.focus();
				jodit.s.setCursorAfter(jodit.s.current()!);
				jodit.s.insertHTML(html);
				__dialog.close();
			},
			onInsert(html: string): void {
				jodit.s.focus();
				jodit.s.insertHTML(html);
				__dialog.close();
			}
		});
	}

	constructor(jodit: IJodit) {
		super(jodit);
		extendLang(langs);
	}

	/** @override */
	override afterInit(jodit: IJodit): void {}

	@watch(':generateAiAssistantForm.ai-assistant')
	protected onGenerateAiAssistantForm(prompt: string): void {
		this.__dialog.open(this.__container, 'AI Assistant');
		this.__container.setPrompt(prompt);
	}

	@watch(':invokeAiAssistant')
	protected onInvokeAiAssistant(prompt: string): void {
		const { jodit } = this;

		jodit.s.focus();
		const selectedText = jodit.s.html;

		jodit.async
			.promise<string>(async (resolve, reject) => {
				try {
					const result = await jodit.o.aiAssistant
						.aiAssistantCallback!(prompt, selectedText);
					resolve(result);
				} catch (error) {
					reject(error);
				}
			})
			.then((htmlFragment: string) => {
				jodit.e.fire('ai-assistant-response', htmlFragment);
			})
			.catch(error => {
				if (isAbortError(error)) {
					return;
				}
				jodit.message.error(error.message);
				jodit.e.fire('ai-assistant-error', error.message);
			});
	}

	/** @override */
	protected beforeDestruct(_: IJodit): void {
		cached<IDestructible>(this, '__container')?.destruct();
		cached<IDestructible>(this, '__dialog')?.destruct();
	}
}

pluginSystem.add('ai-assistant', aiAssistant);
