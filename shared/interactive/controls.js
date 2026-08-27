function formatValue(value, digits, unit) {
	return `${Number(value).toFixed(digits)}${unit}`;
}

export function createRangeControl(container, options) {
	const field = document.createElement("label");
	field.className = "cg-demo__field";

	const heading = document.createElement("span");
	heading.className = "cg-demo__field-heading";

	const name = document.createElement("span");
	name.textContent = options.label;

	const output = document.createElement("output");
	output.className = "cg-demo__value";

	const input = document.createElement("input");
	input.type = "range";
	input.min = String(options.min);
	input.max = String(options.max);
	input.step = String(options.step);
	input.value = String(options.value);
	input.setAttribute("aria-label", options.label);

	heading.append(name, output);
	field.append(heading, input);
	container.append(field);

	const digits = options.digits ?? 1;
	const unit = options.unit ?? "";

	function setValue(value, notify = false) {
		const clamped = Math.min(options.max, Math.max(options.min, Number(value)));
		input.value = String(clamped);
		output.value = formatValue(clamped, digits, unit);
		output.textContent = output.value;

		if (notify) {
			options.onInput(clamped);
		}
	}

	input.addEventListener("input", () => setValue(input.value, true));
	setValue(options.value);

	return {
		input,
		getValue: () => Number(input.value),
		setValue
	};
}

export function createButton(container, label, onClick) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "cg-demo__button";
	button.textContent = label;
	button.addEventListener("click", onClick);
	container.append(button);
	return button;
}

export function createSelectControl(container, options) {
	const field = document.createElement("label");
	field.className = "cg-demo__field";

	const heading = document.createElement("span");
	heading.className = "cg-demo__field-heading";
	heading.textContent = options.label;

	const select = document.createElement("select");
	select.setAttribute("aria-label", options.label);

	for (const choice of options.choices) {
		const option = document.createElement("option");
		option.value = choice.value;
		option.textContent = choice.label;
		select.append(option);
	}

	function setValue(value, notify = false) {
		select.value = value;
		if (notify) {
			options.onChange(select.value);
		}
	}

	select.addEventListener("change", () => setValue(select.value, true));
	field.append(heading, select);
	container.append(field);
	setValue(options.value);

	return {
		select,
		getValue: () => select.value,
		setValue
	};
}
