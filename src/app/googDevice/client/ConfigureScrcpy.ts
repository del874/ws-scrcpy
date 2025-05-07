// 导入必要的模块和类型
import '../../../style/dialog.css';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import { DisplayCombinedInfo } from '../../client/StreamReceiver';
import VideoSettings from '../../VideoSettings';
import { StreamClientScrcpy } from './StreamClientScrcpy';
import Size from '../../Size';
import Util from '../../Util';
import { DisplayInfo } from '../../DisplayInfo';
import { ToolBoxButton } from '../../toolbox/ToolBoxButton';
import SvgImage from '../../ui/SvgImage';
import { PlayerClass } from '../../player/BasePlayer';
import { ToolBoxCheckbox } from '../../toolbox/ToolBoxCheckbox';
import { DeviceTracker } from './DeviceTracker';
import { Attribute } from '../../Attribute';
import { StreamReceiverScrcpy } from './StreamReceiverScrcpy';
import { ParamsStreamScrcpy } from '../../../types/ParamsStreamScrcpy';
import { BaseClient } from '../../client/BaseClient';

/**
 * 配置对话框事件接口
 * @property closed - 对话框关闭事件，包含对话框实例和结果布尔值
 */
interface ConfigureScrcpyEvents {
    closed: { dialog: ConfigureScrcpy; result: boolean };
}

/**
 * 范围类型定义
 * @property max - 最大值
 * @property min - 最小值
 * @property step - 步长
 * @property formatter - 可选的值格式化函数
 */
type Range = {
    max: number;
    min: number;
    step: number;
    formatter?: (value: number) => string;
};

/**
 * Scrcpy流配置对话框类
 * 负责管理设备流的配置界面，包括视频参数设置、编码器选择等
 * 继承自BaseClient并实现ConfigureScrcpyEvents事件接口
 */
export class ConfigureScrcpy extends BaseClient<ParamsStreamScrcpy, ConfigureScrcpyEvents> {
    // 日志标签，用于标识当前实例
    private readonly TAG: string;
    // 设备唯一标识符
    private readonly udid: string;
    // 转义后的设备标识符，用于HTML元素ID
    private readonly escapedUdid: string;
    // 本地存储播放器设置的键名
    private readonly playerStorageKey: string;
    // 设备名称
    private deviceName: string;
    // 流接收器实例，负责与设备通信
    private streamReceiver?: StreamReceiverScrcpy;
    // 当前选择的播放器名称
    private playerName?: string;
    // 设备显示信息
    private displayInfo?: DisplayInfo;
    // 对话框背景元素
    private background: HTMLElement;
    // 对话框主体元素
    private dialogBody?: HTMLElement;
    // 确认按钮
    private okButton?: HTMLButtonElement;
    // 适应屏幕复选框
    private fitToScreenCheckbox?: HTMLInputElement;
    // 重置设置按钮
    private resetSettingsButton?: HTMLButtonElement;
    // 加载设置按钮
    private loadSettingsButton?: HTMLButtonElement;
    // 保存设置按钮
    private saveSettingsButton?: HTMLButtonElement;
    // 播放器选择下拉框
    private playerSelectElement?: HTMLSelectElement;
    // 显示ID选择下拉框
    private displayIdSelectElement?: HTMLSelectElement;
    // 编码器选择下拉框
    private encoderSelectElement?: HTMLSelectElement;
    // 连接状态显示元素
    private connectionStatusElement?: HTMLElement;
    // 对话框容器元素
    private dialogContainer?: HTMLElement;
    // 状态文本
    private statusText = '';
    // 当前连接数
    private connectionCount = 0;

    /**
     * 构造函数
     * @param tracker 设备追踪器实例
     * @param descriptor 设备描述符
     * @param params 流参数配置
     */
    constructor(private readonly tracker: DeviceTracker, descriptor: GoogDeviceDescriptor, params: ParamsStreamScrcpy) {
        super(params);
        this.udid = descriptor.udid;
        this.escapedUdid = Util.escapeUdid(this.udid);
        this.playerStorageKey = `configure_stream::${this.escapedUdid}::player`;
        this.deviceName = descriptor['ro.product.model'];
        this.TAG = `ConfigureScrcpy[${this.udid}]`;
        this.createStreamReceiver(params);
        this.setTitle(`${this.deviceName}. Configure stream`);
        this.background = this.createUI();
    }

    /**
     * 获取设备追踪器实例
     * @returns 当前关联的设备追踪器
     */
    public getTracker(): DeviceTracker {
        return this.tracker;
    }

    /**
     * 创建流接收器实例
     * 如果已有流接收器，先停止并移除事件监听器
     * @param params 流参数配置
     */
    private createStreamReceiver(params: ParamsStreamScrcpy): void {
        if (this.streamReceiver) {
            this.detachEventsListeners(this.streamReceiver);
            this.streamReceiver.stop();
        }
        this.streamReceiver = new StreamReceiverScrcpy(params);
        this.attachEventsListeners(this.streamReceiver);
    }

    /**
     * 为流接收器添加事件监听器
     * @param streamReceiver 流接收器实例
     */
    private attachEventsListeners(streamReceiver: StreamReceiverScrcpy): void {
        streamReceiver.on('encoders', this.onEncoders);
        streamReceiver.on('displayInfo', this.onDisplayInfo);
        streamReceiver.on('connected', this.onConnected);
        streamReceiver.on('disconnected', this.onDisconnected);
    }

    /**
     * 移除流接收器的事件监听器
     * @param streamReceiver 流接收器实例
     */
    private detachEventsListeners(streamReceiver: StreamReceiverScrcpy): void {
        streamReceiver.off('encoders', this.onEncoders);
        streamReceiver.off('displayInfo', this.onDisplayInfo);
        streamReceiver.off('connected', this.onConnected);
        streamReceiver.off('disconnected', this.onDisconnected);
    }

    /**
     * 更新连接状态显示
     * 将当前状态文本和连接数显示在状态元素上
     */
    private updateStatus(): void {
        if (!this.connectionStatusElement) {
            return;
        }
        let text = this.statusText;
        if (this.connectionCount) {
            text = `${text}. Other clients: ${this.connectionCount}.`;
        }
        this.connectionStatusElement.innerText = text;
    }

    /**
     * 编码器列表更新事件处理
     * 更新编码器选择下拉框的选项
     * @param encoders 可用的编码器名称数组
     */
    private onEncoders = (encoders: string[]): void => {
        // console.log(this.TAG, 'Encoders', encoders);
        const select = this.encoderSelectElement || document.createElement('select');
        let child;
        while ((child = select.firstChild)) {
            select.removeChild(child);
        }
        encoders.unshift('');
        encoders.forEach((value) => {
            const optionElement = document.createElement('option');
            optionElement.setAttribute('value', value);
            optionElement.innerText = value;
            select.appendChild(optionElement);
        });
        this.encoderSelectElement = select;
    };

    /**
     * 显示信息更新事件处理
     * 更新显示ID选择下拉框并应用视频设置
     * @param infoArray 显示信息数组，包含显示ID、尺寸等信息
     */
    private onDisplayInfo = (infoArray: DisplayCombinedInfo[]): void => {
        // console.log(this.TAG, 'Received info');
        this.statusText = 'Ready';
        this.updateStatus();
        this.dialogContainer?.classList.add('ready');
        const select = this.displayIdSelectElement || document.createElement('select');
        let child;
        while ((child = select.firstChild)) {
            select.removeChild(child);
        }
        let selectedOptionIdx = -1;
        infoArray.forEach((value: DisplayCombinedInfo, idx: number) => {
            const { displayInfo } = value;
            const { displayId, size } = displayInfo;
            const optionElement = document.createElement('option');
            optionElement.setAttribute('value', displayId.toString());
            optionElement.innerText = `ID: ${displayId}; ${size.width}x${size.height}`;
            select.appendChild(optionElement);
            if (
                (this.displayInfo && this.displayInfo.displayId === displayId) ||
                (!this.displayInfo && displayId === DisplayInfo.DEFAULT_DISPLAY)
            ) {
                selectedOptionIdx = idx;
            }
        });
        if (selectedOptionIdx > -1) {
            select.selectedIndex = selectedOptionIdx;
            const { videoSettings, connectionCount, displayInfo } = infoArray[selectedOptionIdx];
            this.displayInfo = displayInfo;
            if (connectionCount > 0 && videoSettings) {
                // console.log(this.TAG, 'Apply other clients settings');
                this.fillInputsFromVideoSettings(videoSettings, false);
            } else {
                // console.log(this.TAG, 'Apply settings for current player');
                this.updateVideoSettingsForPlayer();
            }
            this.connectionCount = connectionCount;
            this.updateStatus();
        }
        this.displayIdSelectElement = select;
        if (this.dialogBody) {
            this.dialogBody.classList.remove('hidden');
            this.dialogBody.classList.add('visible');
        }
    };

    /**
     * 连接成功事件处理
     * 更新状态文本并启用确认按钮
     */
    private onConnected = (): void => {
        // console.log(this.TAG, 'Connected');
        this.statusText = 'Waiting for info...';
        this.updateStatus();
        if (this.okButton) {
            this.okButton.disabled = false;
        }
    };

    /**
     * 断开连接事件处理
     * 更新状态文本并禁用确认按钮，隐藏对话框主体
     */
    private onDisconnected = (): void => {
        // console.log(this.TAG, 'Disconnected');
        this.statusText = 'Disconnected';
        this.updateStatus();
        if (this.okButton) {
            this.okButton.disabled = true;
        }
        if (this.dialogBody) {
            this.dialogBody.classList.remove('visible');
            this.dialogBody.classList.add('hidden');
        }
    };

    /**
     * 播放器变更事件处理
     * 更新当前播放器的视频设置
     */
    private onPlayerChange = (): void => {
        this.updateVideoSettingsForPlayer();
    };

    /**
     * 显示ID变更事件处理
     * 更新当前显示ID并更新播放器的视频设置
     */
    private onDisplayIdChange = (): void => {
        const select = this.displayIdSelectElement;
        if (!select || !this.streamReceiver) {
            return;
        }
        const value = select.options[select.selectedIndex].value;
        const displayId = parseInt(value, 10);
        if (!isNaN(displayId)) {
            this.displayInfo = this.streamReceiver.getDisplayInfo(displayId);
        }
        this.updateVideoSettingsForPlayer();
    };

    /**
     * 获取当前选择的播放器类
     * @returns 播放器类实例，如果未选择则返回undefined
     */
    private getPlayer(): PlayerClass | undefined {
        if (!this.playerSelectElement) {
            return;
        }
        const playerName = this.playerSelectElement.options[this.playerSelectElement.selectedIndex].value;
        return StreamClientScrcpy.getPlayers().find((playerClass) => {
            return playerClass.playerFullName === playerName;
        });
    }

    /**
     * 更新当前播放器的视频设置
     * 从播放器加载存储或首选的视频设置并填充到UI
     */
    private updateVideoSettingsForPlayer(): void {
        const player = this.getPlayer();
        if (player) {
            this.playerName = player.playerFullName;
            const storedOrPreferred = player.loadVideoSettings(this.udid, this.displayInfo);
            const fitToScreen = player.getFitToScreenStatus(this.udid, this.displayInfo);
            this.fillInputsFromVideoSettings(storedOrPreferred, fitToScreen);
        }
    }

    /**
     * 获取指定ID的基础输入元素
     * @param id 输入元素的ID前缀
     * @returns HTML输入元素或null
     */
    private getBasicInput(id: string): HTMLInputElement | null {
        const element = document.getElementById(`${id}_${this.escapedUdid}`);
        if (!element) {
            return null;
        }
        return element as HTMLInputElement;
    }

    private fillInputsFromVideoSettings(videoSettings: VideoSettings, fitToScreen: boolean): void {
        if (this.displayInfo && this.displayInfo.displayId !== videoSettings.displayId) {
            console.error(this.TAG, `Display id from VideoSettings and DisplayInfo don't match`);
        }
        this.fillBasicInput({ id: 'bitrate' }, videoSettings);
        this.fillBasicInput({ id: 'maxFps' }, videoSettings);
        this.fillBasicInput({ id: 'iFrameInterval' }, videoSettings);
        // this.fillBasicInput({ id: 'displayId' }, videoSettings);
        this.fillBasicInput({ id: 'codecOptions' }, videoSettings);
        if (videoSettings.bounds) {
            const { width, height } = videoSettings.bounds;
            const widthInput = this.getBasicInput('maxWidth');
            if (widthInput) {
                widthInput.value = width.toString(10);
            }
            const heightInput = this.getBasicInput('maxHeight');
            if (heightInput) {
                heightInput.value = height.toString(10);
            }
        }
        if (this.encoderSelectElement) {
            const encoderName = videoSettings.encoderName || '';
            const option = Array.from(this.encoderSelectElement.options).find((element) => {
                return element.value === encoderName;
            });
            if (option) {
                this.encoderSelectElement.selectedIndex = option.index;
            }
        }
        if (this.fitToScreenCheckbox) {
            this.fitToScreenCheckbox.checked = fitToScreen;
            this.onFitToScreenChanged(fitToScreen);
        }
    }

    private onFitToScreenChanged(checked: boolean) {
        const heightInput = this.getBasicInput('maxHeight');
        const widthInput = this.getBasicInput('maxWidth');
        if (!this.fitToScreenCheckbox || !heightInput || !widthInput) {
            return;
        }
        heightInput.disabled = widthInput.disabled = checked;
        if (checked) {
            heightInput.setAttribute(Attribute.VALUE, heightInput.value);
            heightInput.value = '';
            widthInput.setAttribute(Attribute.VALUE, widthInput.value);
            widthInput.value = '';
        } else {
            const storedHeight = heightInput.getAttribute(Attribute.VALUE);
            if (typeof storedHeight === 'string') {
                heightInput.value = storedHeight;
                heightInput.removeAttribute(Attribute.VALUE);
            }
            const storedWidth = widthInput.getAttribute(Attribute.VALUE);
            if (typeof storedWidth === 'string') {
                widthInput.value = storedWidth;
                widthInput.removeAttribute(Attribute.VALUE);
            }
        }
    }

    private fillBasicInput(opts: { id: keyof VideoSettings }, videoSettings: VideoSettings): void {
        const input = this.getBasicInput(opts.id);
        const value = videoSettings[opts.id];
        if (input) {
            if (typeof value !== 'undefined' && value !== '-' && value !== 0 && value !== null) {
                input.value = value.toString(10);
                if (input.getAttribute('type') === 'range') {
                    input.dispatchEvent(new Event('input'));
                }
            } else {
                input.value = '';
            }
        }
    }

    private appendBasicInput(
        parent: HTMLElement,
        opts: { label: string; id: string; range?: Range },
    ): HTMLInputElement {
        const label = document.createElement('label');
        label.classList.add('label');
        label.innerText = `${opts.label}:`;
        label.id = `label_${opts.id}_${this.escapedUdid}`;
        parent.appendChild(label);
        const input = document.createElement('input');
        input.classList.add('input');
        input.id = label.htmlFor = `${opts.id}_${this.escapedUdid}`;
        const { range } = opts;
        if (range) {
            label.setAttribute('title', opts.label);
            input.oninput = () => {
                const value = range.formatter ? range.formatter(parseInt(input.value, 10)) : input.value;
                label.innerText = `${opts.label} (${value}):`;
            };
            input.setAttribute('type', 'range');
            input.setAttribute('max', range.max.toString());
            input.setAttribute('min', range.min.toString());
            input.setAttribute('step', range.step.toString());
        }
        parent.appendChild(input);
        return input;
    }

    private getNumberValueFromInput(name: string): number {
        const value = (document.getElementById(`${name}_${this.escapedUdid}`) as HTMLInputElement).value;
        return parseInt(value, 10);
    }

    private getStringValueFromInput(name: string): string {
        return (document.getElementById(`${name}_${this.escapedUdid}`) as HTMLInputElement).value;
    }

    private getValueFromSelect(name: string): string {
        const select = document.getElementById(`${name}_${this.escapedUdid}`) as HTMLSelectElement;
        return select.options[select.selectedIndex].value;
    }

    private buildVideoSettings(): VideoSettings | null {
        try {
            const bitrate = this.getNumberValueFromInput('bitrate');
            const maxFps = this.getNumberValueFromInput('maxFps');
            const iFrameInterval = this.getNumberValueFromInput('iFrameInterval');
            const maxWidth = this.getNumberValueFromInput('maxWidth');
            const maxHeight = this.getNumberValueFromInput('maxHeight');
            const displayId = this.getNumberValueFromInput('displayId');
            const codecOptions = this.getStringValueFromInput('codecOptions') || undefined;
            let bounds: Size | undefined;
            if (!isNaN(maxWidth) && !isNaN(maxHeight) && maxWidth && maxHeight) {
                bounds = new Size(maxWidth, maxHeight);
            }
            const encoderName = this.getValueFromSelect('encoderName') || undefined;
            return new VideoSettings({
                bitrate,
                bounds,
                maxFps,
                iFrameInterval,
                displayId,
                codecOptions,
                encoderName,
            });
        } catch (error: any) {
            console.error(this.TAG, error.message);
            return null;
        }
    }

    private getFitToScreenValue(): boolean {
        if (!this.fitToScreenCheckbox) {
            return false;
        }
        return this.fitToScreenCheckbox.checked;
    }

    private getPreviouslyUsedPlayer(): string {
        if (!window.localStorage) {
            return '';
        }
        const result = window.localStorage.getItem(this.playerStorageKey);
        if (result) {
            return result;
        } else {
            return '';
        }
    }

    private setPreviouslyUsedPlayer(playerName: string): void {
        if (!window.localStorage) {
            return;
        }
        window.localStorage.setItem(this.playerStorageKey, playerName);
    }

    private createUI(): HTMLElement {
        const dialogName = 'configureDialog';
        const blockClass = 'dialog-block';
        const background = document.createElement('div');
        background.classList.add('dialog-background', dialogName);
        const dialogContainer = (this.dialogContainer = document.createElement('div'));
        dialogContainer.classList.add('dialog-container', dialogName);
        const dialogHeader = document.createElement('div');
        dialogHeader.classList.add('dialog-header', dialogName, 'control-wrapper');
        const backButton = new ToolBoxButton('Back', SvgImage.Icon.ARROW_BACK);

        backButton.addEventListener('click', () => {
            this.cancel();
        });
        backButton.getAllElements().forEach((el) => {
            dialogHeader.appendChild(el);
        });

        const deviceName = document.createElement('span');
        deviceName.classList.add('dialog-title', 'main-title');
        deviceName.innerText = this.deviceName;
        dialogHeader.appendChild(deviceName);
        const dialogBody = (this.dialogBody = document.createElement('div'));
        dialogBody.classList.add('dialog-body', blockClass, dialogName, 'hidden');
        const playerWrapper = document.createElement('div');
        playerWrapper.classList.add('controls');
        const playerLabel = document.createElement('label');
        playerLabel.classList.add('label');
        playerLabel.innerText = 'Player:';
        playerWrapper.appendChild(playerLabel);
        const playerSelect = (this.playerSelectElement = document.createElement('select'));
        playerSelect.classList.add('input');
        playerSelect.id = playerLabel.htmlFor = `player_${this.escapedUdid}`;
        playerWrapper.appendChild(playerSelect);
        dialogBody.appendChild(playerWrapper);
        const previouslyUsedPlayer = this.getPreviouslyUsedPlayer();
        StreamClientScrcpy.getPlayers().forEach((playerClass, index) => {
            const { playerFullName } = playerClass;
            const optionElement = document.createElement('option');
            optionElement.setAttribute('value', playerFullName);
            optionElement.innerText = playerFullName;
            playerSelect.appendChild(optionElement);
            if (playerFullName === previouslyUsedPlayer) {
                playerSelect.selectedIndex = index;
            }
        });
        playerSelect.onchange = this.onPlayerChange;
        this.updateVideoSettingsForPlayer();

        const controls = document.createElement('div');
        controls.classList.add('controls', 'control-wrapper');
        const displayIdLabel = document.createElement('label');
        displayIdLabel.classList.add('label');
        displayIdLabel.innerText = 'Display:';
        controls.appendChild(displayIdLabel);
        if (!this.displayIdSelectElement) {
            this.displayIdSelectElement = document.createElement('select');
        }
        controls.appendChild(this.displayIdSelectElement);
        this.displayIdSelectElement.classList.add('input');
        this.displayIdSelectElement.id = displayIdLabel.htmlFor = `displayId_${this.escapedUdid}`;
        this.displayIdSelectElement.onchange = this.onDisplayIdChange;

        this.appendBasicInput(controls, {
            label: 'Bitrate',
            id: 'bitrate',
            range: { min: 524288, max: 8388608, step: 524288, formatter: Util.prettyBytes },
        });
        this.appendBasicInput(controls, {
            label: 'Max FPS',
            id: 'maxFps',
            range: { min: 1, max: 60, step: 1 },
        });
        this.appendBasicInput(controls, { label: 'I-Frame interval', id: 'iFrameInterval' });
        const fitLabel = document.createElement('label');
        fitLabel.innerText = 'Fit to screen';
        fitLabel.classList.add('label');
        controls.appendChild(fitLabel);
        const fitToggle = new ToolBoxCheckbox(
            'Fit to screen',
            { off: SvgImage.Icon.TOGGLE_OFF, on: SvgImage.Icon.TOGGLE_ON },
            'fit_to_screen',
        );
        fitToggle.getAllElements().forEach((el) => {
            controls.appendChild(el);
            if (el instanceof HTMLLabelElement) {
                fitLabel.htmlFor = el.htmlFor;
                el.classList.add('input');
            }
            if (el instanceof HTMLInputElement) {
                this.fitToScreenCheckbox = el;
            }
        });
        fitToggle.addEventListener('click', (_, el) => {
            const element = el.getElement();
            this.onFitToScreenChanged(element.checked);
        });
        this.appendBasicInput(controls, { label: 'Max width', id: 'maxWidth' });
        this.appendBasicInput(controls, { label: 'Max height', id: 'maxHeight' });
        this.appendBasicInput(controls, { label: 'Codec options', id: 'codecOptions' });

        const encoderLabel = document.createElement('label');
        encoderLabel.classList.add('label');
        encoderLabel.innerText = 'Encoder:';
        controls.appendChild(encoderLabel);
        if (!this.encoderSelectElement) {
            this.encoderSelectElement = document.createElement('select');
        }
        controls.appendChild(this.encoderSelectElement);
        this.encoderSelectElement.classList.add('input');
        this.encoderSelectElement.id = encoderLabel.htmlFor = `encoderName_${this.escapedUdid}`;

        dialogBody.appendChild(controls);

        const buttonsWrapper = document.createElement('div');
        buttonsWrapper.classList.add('controls');

        const resetSettingsButton = (this.resetSettingsButton = document.createElement('button'));
        resetSettingsButton.classList.add('button');
        resetSettingsButton.innerText = 'Reset settings';
        resetSettingsButton.addEventListener('click', this.resetSettings);
        buttonsWrapper.appendChild(resetSettingsButton);

        const loadSettingsButton = (this.loadSettingsButton = document.createElement('button'));
        loadSettingsButton.classList.add('button');
        loadSettingsButton.innerText = 'Load settings';
        loadSettingsButton.addEventListener('click', this.loadSettings);
        buttonsWrapper.appendChild(loadSettingsButton);

        const saveSettingsButton = (this.saveSettingsButton = document.createElement('button'));
        saveSettingsButton.classList.add('button');
        saveSettingsButton.innerText = 'Save settings';
        saveSettingsButton.addEventListener('click', this.saveSettings);
        buttonsWrapper.appendChild(saveSettingsButton);

        dialogBody.appendChild(buttonsWrapper);

        const dialogFooter = document.createElement('div');
        dialogFooter.classList.add('dialog-footer', blockClass, dialogName);
        const statusElement = document.createElement('span');
        statusElement.classList.add('subtitle');
        this.connectionStatusElement = statusElement;
        dialogFooter.appendChild(statusElement);
        this.statusText = `Connecting...`;
        this.updateStatus();

        // const cancelButton = (this.cancelButton = document.createElement('button'));
        // cancelButton.innerText = 'Cancel';
        // cancelButton.addEventListener('click', this.cancel);
        const okButton = (this.okButton = document.createElement('button'));
        okButton.innerText = 'Open';
        okButton.disabled = true;
        okButton.addEventListener('click', this.openStream);
        dialogFooter.appendChild(okButton);
        // dialogFooter.appendChild(cancelButton);
        dialogBody.appendChild(dialogFooter);
        dialogContainer.appendChild(dialogHeader);
        dialogContainer.appendChild(dialogBody);
        dialogContainer.appendChild(dialogFooter);
        background.appendChild(dialogContainer);
        background.addEventListener('click', this.onBackgroundClick);
        document.body.appendChild(background);
        return background;
    }

    private removeUI(): void {
        document.body.removeChild(this.background);
        this.okButton?.removeEventListener('click', this.openStream);
        // this.cancelButton?.removeEventListener('click', this.cancel);
        this.resetSettingsButton?.removeEventListener('click', this.resetSettings);
        this.loadSettingsButton?.removeEventListener('click', this.loadSettings);
        this.saveSettingsButton?.removeEventListener('click', this.saveSettings);
        this.background.removeEventListener('click', this.onBackgroundClick);
    }

    private onBackgroundClick = (event: MouseEvent): void => {
        if (event.target !== event.currentTarget) {
            return;
        }
        this.cancel();
    };

    private cancel = (): void => {
        if (this.streamReceiver) {
            this.detachEventsListeners(this.streamReceiver);
            this.streamReceiver.stop();
        }
        this.emit('closed', { dialog: this, result: false });
        this.removeUI();
    };

    private resetSettings = (): void => {
        const player = this.getPlayer();
        if (player) {
            this.fillInputsFromVideoSettings(player.getPreferredVideoSetting(), false);
        }
    };

    private loadSettings = (): void => {
        this.updateVideoSettingsForPlayer();
    };

    private saveSettings = (): void => {
        const videoSettings = this.buildVideoSettings();
        const player = this.getPlayer();
        if (videoSettings && player) {
            const fitToScreen = this.getFitToScreenValue();
            player.saveVideoSettings(this.udid, videoSettings, fitToScreen, this.displayInfo);
        }
    };

    private openStream = (): void => {
        const videoSettings = this.buildVideoSettings();
        if (!videoSettings || !this.streamReceiver || !this.playerName) {
            return;
        }
        const fitToScreen = this.getFitToScreenValue();
        this.detachEventsListeners(this.streamReceiver);
        this.emit('closed', { dialog: this, result: true });
        this.removeUI();
        const player = StreamClientScrcpy.createPlayer(this.playerName, this.udid, this.displayInfo);
        if (!player) {
            return;
        }
        this.setPreviouslyUsedPlayer(this.playerName);
        // return;
        player.setVideoSettings(videoSettings, fitToScreen, false);
        const params: ParamsStreamScrcpy = {
            ...this.params,
            udid: this.udid,
            fitToScreen,
        };
        StreamClientScrcpy.start(params, this.streamReceiver, player, fitToScreen, videoSettings);
        this.streamReceiver.triggerInitialInfoEvents();
    };
}
