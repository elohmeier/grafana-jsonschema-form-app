import React, { ChangeEvent, FocusEvent } from 'react';
import { css } from '@emotion/css';
import { dateTime, IconName } from '@grafana/data';
import {
  Alert,
  Button,
  Checkbox,
  Combobox,
  ComboboxOption,
  DatePickerWithInput,
  DateTimePicker,
  Field,
  FileDropzone,
  FileDropzoneDefaultChildren,
  IconButton,
  Input,
  MultiCombobox,
  RadioButtonGroup,
  SecretInput,
  Slider,
  Stack,
  Switch,
  TextArea,
  TimeOfDayPicker,
  useStyles2,
} from '@grafana/ui';
import { ThemeProps, withTheme } from '@rjsf/core';
import {
  ADDITIONAL_PROPERTY_FLAG,
  ArrayFieldItemTemplateProps,
  ArrayFieldTemplateProps,
  BaseInputTemplateProps,
  buttonId,
  canExpand,
  DescriptionFieldProps,
  enumOptionSelectedValue,
  enumOptionValueDecoder,
  enumOptionValueEncoder,
  ErrorListProps,
  FieldErrorProps,
  FieldHelpProps,
  FieldTemplateProps,
  FormContextType,
  getInputProps,
  getOptionValueFormat,
  getSubmitButtonOptions,
  getUiOptions,
  IconButtonProps,
  MultiSchemaFieldTemplateProps,
  ObjectFieldTemplateProps,
  OptionalDataControlsTemplateProps,
  RJSFSchema,
  StrictRJSFSchema,
  SubmitButtonProps,
  TitleFieldProps,
  TranslatableString,
  WidgetProps,
  WrapIfAdditionalTemplateProps,
} from '@rjsf/utils';
import { formatJsonSchemaTime } from './time';

type OptionValue = string;

const emptyObject = {};

function toDropzoneAccept(accept: unknown) {
  if (typeof accept !== 'string') {
    return undefined;
  }

  if (accept.includes('/')) {
    return { [accept]: [] };
  }

  return accept;
}

function useThemeStyles() {
  return useStyles2((theme) => ({
    hidden: css({
      display: 'none',
    }),
    fieldWrapper: css({
      minWidth: 0,
      width: '100%',
    }),
    help: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      marginTop: theme.spacing(0.5),
    }),
    fieldset: css({
      border: 0,
      padding: 0,
      margin: 0,
      minWidth: 0,
    }),
    fieldsetBody: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    titleRow: css({
      alignItems: 'center',
      display: 'flex',
      gap: theme.spacing(1),
      justifyContent: 'space-between',
      marginBottom: theme.spacing(1),
    }),
    title: css({
      color: theme.colors.text.primary,
      fontSize: theme.typography.h4.fontSize,
      fontWeight: theme.typography.fontWeightMedium,
      lineHeight: 1.3,
      margin: 0,
    }),
    description: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      marginBottom: theme.spacing(1),
    }),
    arrayItem: css({
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      padding: theme.spacing(1.5),
    }),
    arrayItemToolbar: css({
      borderTop: `1px solid ${theme.colors.border.weak}`,
      marginTop: theme.spacing(1),
      paddingTop: theme.spacing(1),
    }),
    additional: css({
      alignItems: 'flex-start',
      display: 'grid',
      gap: theme.spacing(1),
      gridTemplateColumns: 'minmax(160px, 240px) minmax(0, 1fr) auto',
    }),
    fileWidget: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
    }),
    fileValue: css({
      alignItems: 'center',
      color: theme.colors.text.secondary,
      display: 'flex',
      fontSize: theme.typography.bodySmall.fontSize,
      gap: theme.spacing(1),
      justifyContent: 'space-between',
    }),
    errorList: css({
      marginBottom: theme.spacing(2),
    }),
  }));
}

function toInputValue(value: unknown, type: string | undefined) {
  if (type === 'number' || type === 'integer') {
    return value || value === 0 ? value : '';
  }

  return value == null ? '' : value;
}

function BaseInputTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: BaseInputTemplateProps<T, S, F>
) {
  const {
    id,
    htmlName,
    value,
    readonly,
    disabled,
    autofocus,
    onBlur,
    onFocus,
    onChange,
    onChangeOverride,
    options,
    schema,
    rawErrors,
    type,
    ...rest
  } = props;

  const inputProps = getInputProps<T, S, F>(schema, type, options);
  const inputValue = toInputValue(value, inputProps.type);
  const invalid = Boolean(rawErrors?.length);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value === '' ? options.emptyValue : event.currentTarget.value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => onBlur(id, event.currentTarget.value);
  const handleFocus = (event: FocusEvent<HTMLInputElement>) => onFocus(id, event.currentTarget.value);

  return (
    <Input
      {...rest}
      {...inputProps}
      id={id}
      name={htmlName || id}
      value={inputValue as string | number}
      readOnly={readonly}
      disabled={disabled}
      autoFocus={autofocus}
      invalid={invalid}
      onChange={onChangeOverride || handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
  );
}

function TextareaWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  htmlName,
  value,
  readonly,
  disabled,
  autofocus,
  placeholder,
  onBlur,
  onFocus,
  onChange,
  options,
  rawErrors,
}: WidgetProps<T, S, F>) {
  const rows = typeof options.rows === 'number' ? options.rows : 6;

  return (
    <TextArea
      id={id}
      name={htmlName || id}
      value={value ?? ''}
      rows={rows}
      readOnly={readonly}
      disabled={disabled}
      autoFocus={autofocus}
      placeholder={placeholder}
      invalid={Boolean(rawErrors?.length)}
      onBlur={(event) => onBlur(id, event.currentTarget.value)}
      onFocus={(event) => onFocus(id, event.currentTarget.value)}
      onChange={(event) => onChange(event.currentTarget.value === '' ? options.emptyValue : event.currentTarget.value)}
    />
  );
}

function InputWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: WidgetProps<T, S, F> & { type?: string }
) {
  return <BaseInputTemplate {...props} />;
}

function PasswordWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: WidgetProps<T, S, F>
) {
  return <BaseInputTemplate {...props} type="password" autoComplete="new-password" />;
}

function SecretWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  htmlName,
  value,
  readonly,
  disabled,
  autofocus,
  placeholder,
  onChange,
  onBlur,
  onFocus,
  options,
  rawErrors,
}: WidgetProps<T, S, F>) {
  return (
    <SecretInput
      id={id}
      name={htmlName || id}
      value={value ?? ''}
      isConfigured={Boolean(value)}
      readOnly={readonly}
      disabled={disabled}
      autoFocus={autofocus}
      placeholder={placeholder}
      invalid={Boolean(rawErrors?.length)}
      onReset={() => onChange(options.emptyValue)}
      onBlur={(event) => onBlur(id, event.currentTarget.value)}
      onFocus={(event) => onFocus(id, event.currentTarget.value)}
      onChange={(event) => onChange(event.currentTarget.value === '' ? options.emptyValue : event.currentTarget.value)}
    />
  );
}

function CheckboxWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  value,
  label,
  hideLabel,
  readonly,
  disabled,
  onChange,
  onBlur,
  onFocus,
  rawErrors,
}: WidgetProps<T, S, F>) {
  return (
    <Checkbox
      id={id}
      value={Boolean(value)}
      label={hideLabel ? undefined : label}
      disabled={disabled || readonly}
      invalid={Boolean(rawErrors?.length)}
      onChange={(event) => onChange(event.currentTarget.checked)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
    />
  );
}

function SwitchWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  value,
  readonly,
  disabled,
  onChange,
  onBlur,
  onFocus,
  rawErrors,
}: WidgetProps<T, S, F>) {
  return (
    <Switch
      id={id}
      value={Boolean(value)}
      disabled={disabled || readonly}
      invalid={Boolean(rawErrors?.length)}
      onChange={(event) => onChange(event.currentTarget.checked)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
    />
  );
}

function RangeWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  value,
  schema,
  onChange,
}: WidgetProps<T, S, F>) {
  const min = typeof schema.minimum === 'number' ? schema.minimum : 0;
  const max = typeof schema.maximum === 'number' ? schema.maximum : 100;
  const step = typeof schema.multipleOf === 'number' ? schema.multipleOf : 1;

  return (
    <Slider
      inputId={id}
      min={min}
      max={max}
      step={step}
      value={typeof value === 'number' ? value : min}
      onChange={onChange}
    />
  );
}

function DateWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  value,
  disabled,
  readonly,
  placeholder,
  onChange,
  onBlur,
  onFocus,
}: WidgetProps<T, S, F>) {
  return (
    <DatePickerWithInput
      id={id}
      value={value}
      disabled={disabled || readonly}
      placeholder={placeholder}
      closeOnSelect
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
      onChange={(nextValue) =>
        onChange(nextValue instanceof Date ? dateTime(nextValue).format('YYYY-MM-DD') : nextValue || undefined)
      }
    />
  );
}

function DateTimeWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  value,
  disabled,
  readonly,
  onChange,
  options,
}: WidgetProps<T, S, F>) {
  return (
    <DateTimePicker
      date={value ? dateTime(value) : undefined}
      clearable
      showSeconds={Boolean(options.showSeconds)}
      onChange={(nextValue) => onChange(nextValue ? nextValue.toISOString() : options.emptyValue)}
      disabledHours={disabled || readonly ? () => Array.from({ length: 24 }, (_, index) => index) : undefined}
    />
  );
}

function TimeWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  value,
  disabled,
  readonly,
  placeholder,
  onChange,
  options,
}: WidgetProps<T, S, F>) {
  const showSeconds = Boolean(options.showSeconds);

  return (
    <TimeOfDayPicker
      id={id}
      value={value ? dateTime(`1970-01-01T${value}`) : undefined}
      allowEmpty
      disabled={disabled || readonly}
      placeholder={placeholder}
      showSeconds={showSeconds}
      onChange={(nextValue) => onChange(nextValue ? formatJsonSchemaTime(nextValue, showSeconds) : options.emptyValue)}
    />
  );
}

function FileWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  value,
  disabled,
  readonly,
  multiple,
  onChange,
  options,
}: WidgetProps<T, S, F>) {
  const styles = useThemeStyles();
  const hasValue = Array.isArray(value) ? value.length > 0 : Boolean(value);
  const accept = toDropzoneAccept(options.accept);
  const acceptLabel = typeof options.accept === 'string' ? options.accept : undefined;

  const onLoad = (result: string | ArrayBuffer | null) => {
    if (typeof result !== 'string') {
      return;
    }

    if (multiple) {
      onChange([...(Array.isArray(value) ? value : []), result]);
      return;
    }

    onChange(result);
  };

  return (
    <div className={styles.fileWidget}>
      <FileDropzone
        id={id}
        readAs="readAsDataURL"
        onLoad={onLoad}
        options={{ accept, disabled: disabled || readonly, multiple: Boolean(multiple) }}
      >
        <FileDropzoneDefaultChildren primaryText="Drop a file or click to upload" secondaryText={acceptLabel} />
      </FileDropzone>
      {hasValue && (
        <div className={styles.fileValue}>
          <span>{Array.isArray(value) ? `${value.length} files encoded` : 'File encoded as data URL'}</span>
          <Button type="button" size="sm" fill="text" icon="times" onClick={() => onChange(options.emptyValue)}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

function HiddenWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  value,
  onChange,
}: WidgetProps<T, S, F>) {
  return <input id={id} type="hidden" value={value ?? ''} onChange={(event) => onChange(event.currentTarget.value)} />;
}

function RadioWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  options,
  value,
  disabled,
  readonly,
  onChange,
}: WidgetProps<T, S, F>) {
  const enumOptions = options.enumOptions ?? [];

  return (
    <RadioButtonGroup
      id={id}
      value={value}
      disabled={disabled || readonly}
      options={enumOptions.map((option) => ({ label: option.label, value: option.value }))}
      onChange={onChange}
    />
  );
}

function SelectWidget<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  options,
  value,
  required,
  disabled,
  readonly,
  multiple = false,
  placeholder,
  onChange,
  onBlur,
  onFocus,
  rawErrors,
}: WidgetProps<T, S, F>) {
  const { enumOptions = [], emptyValue: optEmptyValue } = options;
  const optionValueFormat = getOptionValueFormat(options);
  const grafanaOptions = enumOptions.map((option, index) => ({
    label: option.label,
    value: enumOptionValueEncoder(option.value, index, optionValueFormat) as OptionValue,
  }));

  if (multiple) {
    const selected = enumOptionSelectedValue<S>(value, enumOptions, true, optionValueFormat, []) as OptionValue[];

    return (
      <MultiCombobox<OptionValue>
        id={id}
        value={selected}
        options={grafanaOptions}
        disabled={disabled || readonly}
        invalid={Boolean(rawErrors?.length)}
        placeholder={placeholder}
        onBlur={() => onBlur(id, value)}
        onChange={(selectedOptions) =>
          onChange(
            enumOptionValueDecoder<S>(
              selectedOptions.map((option) => option.value),
              enumOptions,
              optionValueFormat,
              optEmptyValue
            )
          )
        }
      />
    );
  }

  const selected = enumOptionSelectedValue<S>(value, enumOptions, false, optionValueFormat, '') as OptionValue;
  const optionsWithPlaceholder = required
    ? grafanaOptions
    : [{ label: placeholder || '', value: '' as OptionValue }, ...grafanaOptions];
  const handleSingleChange = (selectedOption: ComboboxOption<OptionValue> | null) =>
    onChange(enumOptionValueDecoder<S>(selectedOption?.value ?? '', enumOptions, optionValueFormat, optEmptyValue));

  if (required) {
    return (
      <Combobox<OptionValue>
        id={id}
        value={selected}
        options={optionsWithPlaceholder}
        disabled={disabled || readonly}
        invalid={Boolean(rawErrors?.length)}
        placeholder={placeholder}
        onBlur={() => onBlur(id, value)}
        onChange={handleSingleChange}
      />
    );
  }

  return (
    <Combobox<OptionValue>
      id={id}
      value={selected || null}
      options={optionsWithPlaceholder}
      disabled={disabled || readonly}
      invalid={Boolean(rawErrors?.length)}
      placeholder={placeholder}
      isClearable={true}
      onBlur={() => onBlur(id, value)}
      onChange={handleSingleChange}
    />
  );
}

function FieldTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: FieldTemplateProps<T, S, F>
) {
  const styles = useThemeStyles();
  const { children, displayLabel, hidden, label, rawDescription, rawErrors, rawHelp, required } = props;
  const uiOptions = getUiOptions<T, S, F>(props.uiSchema);
  const isCheckbox = uiOptions.widget === 'checkbox';
  const invalid = Boolean(rawErrors?.length);
  const error = invalid ? rawErrors?.join('\n') : undefined;

  if (hidden) {
    return <div className={styles.hidden}>{children}</div>;
  }

  const field = isCheckbox ? (
    <div className={styles.fieldWrapper}>{children}</div>
  ) : (
    <Field label={displayLabel ? label : undefined} required={required} description={rawDescription} invalid={invalid} error={error}>
      <div className={styles.fieldWrapper}>{children}</div>
    </Field>
  );

  return (
    <WrapIfAdditionalTemplate {...props}>
      {field}
      {rawHelp && <div className={styles.help}>{rawHelp}</div>}
    </WrapIfAdditionalTemplate>
  );
}

function WrapIfAdditionalTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: WrapIfAdditionalTemplateProps<T, S, F>
) {
  const styles = useThemeStyles();
  const {
    children,
    disabled,
    id,
    label,
    onKeyRenameBlur,
    onRemoveProperty,
    readonly,
    registry,
    required,
    schema,
  } = props;
  const additional = ADDITIONAL_PROPERTY_FLAG in schema;

  if (!additional) {
    return <div className={styles.fieldWrapper}>{children}</div>;
  }

  const keyLabel = registry.translateString(TranslatableString.KeyLabel, [label]);

  return (
    <div className={styles.additional}>
      <Field label={keyLabel} required={required}>
        <Input id={`${id}-key`} defaultValue={label} onBlur={onKeyRenameBlur} />
      </Field>
      <div>{children}</div>
      <IconButton
        name="trash-alt"
        tooltip={registry.translateString(TranslatableString.RemoveButton)}
        disabled={disabled || readonly}
        onClick={onRemoveProperty}
        variant="destructive"
      />
    </div>
  );
}

function ObjectFieldTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: ObjectFieldTemplateProps<T, S, F>
) {
  const styles = useThemeStyles();
  const {
    description,
    disabled,
    fieldPathId,
    formData,
    onAddProperty,
    optionalDataControl,
    properties,
    readonly,
    registry,
    required,
    schema,
    title,
    uiSchema,
  } = props;
  const { AddButton } = registry.templates.ButtonTemplates;

  return (
    <fieldset className={styles.fieldset} id={fieldPathId.$id}>
      {(title || optionalDataControl) && (
        <div className={styles.titleRow}>
          {title && (
            <h3 className={styles.title}>
              {title}
              {required ? ' *' : ''}
            </h3>
          )}
          {optionalDataControl}
        </div>
      )}
      {description && <div className={styles.description}>{description}</div>}
      <div className={styles.fieldsetBody}>{properties.map((property) => property.content)}</div>
      {canExpand<T, S, F>(schema, uiSchema, formData) && (
        <AddButton
          id={buttonId(fieldPathId, 'add')}
          onClick={onAddProperty}
          disabled={disabled || readonly}
          uiSchema={uiSchema}
          registry={registry}
        />
      )}
    </fieldset>
  );
}

function ArrayFieldTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: ArrayFieldTemplateProps<T, S, F>
) {
  const styles = useThemeStyles();
  const { canAdd, disabled, fieldPathId, items, onAddClick, readonly, registry, required, title, uiSchema } = props;
  const { AddButton } = registry.templates.ButtonTemplates;

  return (
    <fieldset className={styles.fieldset} id={fieldPathId.$id}>
      {(title || canAdd) && (
        <div className={styles.titleRow}>
          {title && (
            <h3 className={styles.title}>
              {title}
              {required ? ' *' : ''}
            </h3>
          )}
          {canAdd && (
            <AddButton onClick={onAddClick} disabled={disabled || readonly} uiSchema={uiSchema} registry={registry} />
          )}
        </div>
      )}
      <Stack direction="column" gap={1}>
        {items}
      </Stack>
    </fieldset>
  );
}

function ArrayFieldItemTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  buttonsProps,
  children,
  hasToolbar,
}: ArrayFieldItemTemplateProps<T, S, F>) {
  const styles = useThemeStyles();
  const { CopyButton, MoveDownButton, MoveUpButton, RemoveButton } = buttonsProps.registry.templates.ButtonTemplates;

  return (
    <div className={styles.arrayItem}>
      {children}
      {hasToolbar && (
        <div className={styles.arrayItemToolbar}>
          <Stack direction="row" gap={0.5}>
            {buttonsProps.hasCopy && <CopyButton {...buttonsProps} onClick={buttonsProps.onCopyItem} />}
            {buttonsProps.hasMoveUp && <MoveUpButton {...buttonsProps} onClick={buttonsProps.onMoveUpItem} />}
            {buttonsProps.hasMoveDown && <MoveDownButton {...buttonsProps} onClick={buttonsProps.onMoveDownItem} />}
            {buttonsProps.hasRemove && <RemoveButton {...buttonsProps} onClick={buttonsProps.onRemoveItem} />}
          </Stack>
        </div>
      )}
    </div>
  );
}

function TitleFieldTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  id,
  optionalDataControl,
  required,
  title,
}: TitleFieldProps<T, S, F>) {
  const styles = useThemeStyles();

  return (
    <div className={styles.titleRow}>
      <h3 className={styles.title} id={id}>
        {title}
        {required ? ' *' : ''}
      </h3>
      {optionalDataControl}
    </div>
  );
}

function DescriptionFieldTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  description,
  id,
}: DescriptionFieldProps<T, S, F>) {
  const styles = useThemeStyles();

  if (!description) {
    return null;
  }

  return (
    <div className={styles.description} id={id}>
      {description}
    </div>
  );
}

function FieldErrorTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  errors = [],
}: FieldErrorProps<T, S, F>) {
  if (!errors.length) {
    return null;
  }

  return <>{errors.map((error, index) => (React.isValidElement(error) ? error : <div key={index}>{error}</div>))}</>;
}

function FieldHelpTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  help,
}: FieldHelpProps<T, S, F>) {
  const styles = useThemeStyles();

  if (!help) {
    return null;
  }

  return <div className={styles.help}>{help}</div>;
}

function ErrorListTemplate<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  errors,
}: ErrorListProps<T, S, F>) {
  const styles = useThemeStyles();

  if (!errors.length) {
    return null;
  }

  return (
    <Alert className={styles.errorList} title="Validation errors" severity="error">
      <ul>
        {errors.map((error, index) => (
          <li key={index}>{error.stack}</li>
        ))}
      </ul>
    </Alert>
  );
}

function MultiSchemaFieldTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>({ optionSchemaField, selector }: MultiSchemaFieldTemplateProps<T, S, F>) {
  return (
    <Stack direction="column" gap={1}>
      {selector}
      {optionSchemaField}
    </Stack>
  );
}

function OptionalDataControlsTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>({ label, onAddClick, onRemoveClick }: OptionalDataControlsTemplateProps<T, S, F>) {
  if (onAddClick) {
    return (
      <Button type="button" size="sm" fill="text" icon="plus" onClick={onAddClick}>
        {label}
      </Button>
    );
  }

  if (onRemoveClick) {
    return (
      <Button type="button" size="sm" fill="text" icon="trash-alt" variant="destructive" onClick={onRemoveClick}>
        {label}
      </Button>
    );
  }

  return null;
}

function SubmitButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>({
  uiSchema,
}: SubmitButtonProps<T, S, F>) {
  const { norender, props = emptyObject, submitText } = getSubmitButtonOptions<T, S, F>(uiSchema);

  if (norender) {
    return null;
  }

  return (
    <Button type="submit" {...props}>
      {submitText}
    </Button>
  );
}

function iconButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: IconButtonProps<T, S, F>,
  name: IconName,
  label: string,
  variant: 'secondary' | 'destructive' = 'secondary'
) {
  const { className, disabled, onClick, style } = props;

  return (
    <IconButton
      className={className}
      disabled={disabled}
      name={name}
      onClick={onClick}
      style={style}
      tooltip={label}
      variant={variant}
    />
  );
}

function AddButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: IconButtonProps<T, S, F>
) {
  return (
    <Button type="button" size="sm" fill="text" icon="plus" disabled={props.disabled} onClick={props.onClick}>
      {props.registry.translateString(TranslatableString.AddButton)}
    </Button>
  );
}

function CopyButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: IconButtonProps<T, S, F>
) {
  return iconButton(props, 'copy', props.registry.translateString(TranslatableString.CopyButton));
}

function MoveDownButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: IconButtonProps<T, S, F>
) {
  return iconButton(props, 'arrow-down', props.registry.translateString(TranslatableString.MoveDownButton));
}

function MoveUpButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: IconButtonProps<T, S, F>
) {
  return iconButton(props, 'arrow-up', props.registry.translateString(TranslatableString.MoveUpButton));
}

function RemoveButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: IconButtonProps<T, S, F>
) {
  return iconButton(props, 'trash-alt', props.registry.translateString(TranslatableString.RemoveButton), 'destructive');
}

function ClearButton<T = any, S extends StrictRJSFSchema = RJSFSchema, F extends FormContextType = any>(
  props: IconButtonProps<T, S, F>
) {
  return iconButton(props, 'times', props.registry.translateString(TranslatableString.ClearButton));
}

const grafanaTheme: ThemeProps = {
  templates: {
    ArrayFieldItemTemplate,
    ArrayFieldTemplate,
    BaseInputTemplate,
    ButtonTemplates: {
      AddButton,
      ClearButton,
      CopyButton,
      MoveDownButton,
      MoveUpButton,
      RemoveButton,
      SubmitButton,
    },
    DescriptionFieldTemplate,
    ErrorListTemplate,
    FieldErrorTemplate,
    FieldHelpTemplate,
    FieldTemplate,
    MultiSchemaFieldTemplate,
    ObjectFieldTemplate,
    OptionalDataControlsTemplate,
    TitleFieldTemplate,
    WrapIfAdditionalTemplate,
  },
  widgets: {
    CheckboxWidget,
    CheckboxesWidget: (props) => <SelectWidget {...props} multiple />,
    DateTimeWidget,
    DateWidget,
    EmailWidget: InputWidget,
    FileWidget,
    HiddenWidget,
    PasswordWidget,
    RadioWidget,
    RangeWidget,
    SecretWidget,
    SelectWidget,
    SwitchWidget,
    TextareaWidget,
    TextWidget: InputWidget,
    TimeWidget,
    URLWidget: InputWidget,
    UpDownWidget: InputWidget,
    checkbox: CheckboxWidget,
    checkboxes: (props) => <SelectWidget {...props} multiple />,
    date: DateWidget,
    'date-time': DateTimeWidget,
    email: InputWidget,
    file: FileWidget,
    hidden: HiddenWidget,
    password: PasswordWidget,
    radio: RadioWidget,
    range: RangeWidget,
    secret: SecretWidget,
    select: SelectWidget,
    switch: SwitchWidget,
    textarea: TextareaWidget,
    text: InputWidget,
    time: TimeWidget,
    updown: InputWidget,
    url: InputWidget,
  },
};

export const GrafanaJsonSchemaForm = withTheme(grafanaTheme);

export default GrafanaJsonSchemaForm;
