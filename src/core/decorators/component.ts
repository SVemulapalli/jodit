/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2021 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

/**
 * Any UI component inherited from [[UIElement]] must have a component decorator
 * This decorator calls `setStatus('ready')` after the `new UI()` operation
 * All other decorators start their work only when the component is ready to work.
 *
 * ```typescript
 * @component()
 * class UIHeight extends UIElement {
 * 	public state = {
 * 		height: 10
 * 	}
 *
 * 	@watch('state.height')
 * 	protected onChangeHeight() {
 * 		this.container.style.height = this.state.height + 'px'
 * 	}
 * }
 *
 * @component()
 * class UIWidth extends UIHeight {
 * 	public state = {
 * 		height: 10,
 * 		width: 10
 * 	}
 *
 * 	@watch('state.width')
 * 	protected onChangeWidth() {
 * 		this.container.style.width = this.state.width + 'px'
 * 	}
 *
 * 	constructor(jodit: IJodit) {
 * 		super(jodit);
 * 		console.log(this.componentStatus) // beforeReady
 * 	}
 * }
 *
 * const elm = new UIWidth(jodit);
 * console.log(elm.componentStatus); // ready
 * elm.state.width = 100;
 * ```
 *
 * You can choose not to use a decorator when you need to independently manage the readiness of a component to work.
 * ```ts
 * class UIData extends UIElement {
 * 	public state = {
 * 		data: {},
 * 	}
 *
 * 	@watch('state.data')
 * 	protected onChangeWidth() {
 * 		this.container.innerText = this.state.data.content;
 * 	}
 *
 * 	@hook('ready')
 * 	protected onReady() {
 * 		alert('I'm ready)
 * 	}
 * }
 *
 * const elm = new UIData(jodit);
 *
 * fetch('index.php').then((resp) => {
 * 	elm.state.data = resp.json();
 * 	elm.setStatus('ready')
 * })
 * ```
 * @module decorators/component
 */

import { isFunction } from '../helpers';

interface ComponentCompatible {
	className?: () => string;
	new (...constructorArgs: any[]): any;
}

/**
 * Safe access to ClassName
 */
const cn = (elm: ComponentCompatible): string | number => {
	return isFunction(elm.className) ? elm.className() : NaN;
};

/**
 * Decorate components and set status isReady after constructor
 * @param constructorFunction - Component constructor class
 */
export function component<T extends ComponentCompatible>(
	constructorFunction: T
): T {
	class newConstructorFunction extends constructorFunction {
		constructor(...args: any[]) {
			super(...args);

			const isSamePrototype =
				Object.getPrototypeOf(this) ===
				newConstructorFunction.prototype;

			/** For strange minimizer */
			const isSameClassName =
				cn(this as unknown as ComponentCompatible) ===
				cn(newConstructorFunction.prototype);

			if (!isProd && isSamePrototype && !isSameClassName) {
				throw new Error('Need use decorator only for components');
			}

			if (isSamePrototype || isSameClassName) {
				this.setStatus('ready');
			}
		}
	}

	newConstructorFunction.prototype.constructor = constructorFunction;

	return newConstructorFunction;
}
