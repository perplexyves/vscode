/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import nls = require('vs/nls');
import { Registry } from 'vs/platform/registry/common/platform';
import { Action, IAction } from 'vs/base/common/actions';
import { ActionItem, BaseActionItem, Separator } from 'vs/base/browser/ui/actionbar/actionbar';
import { Scope, IActionBarRegistry, Extensions as ActionBarExtensions, ActionBarContributor } from 'vs/workbench/browser/actions';
import { GlobalNewUntitledFileAction, SaveFileAsAction, ShowOpenedFileInNewWindow, CopyPathAction, GlobalCopyPathAction, RevealInOSAction, GlobalRevealInOSAction, pasteIntoFocusedFilesExplorerViewItem, FocusOpenEditorsView, FocusFilesExplorer, GlobalCompareResourcesAction, GlobalNewFileAction, GlobalNewFolderAction, RevertFileAction, SaveFilesAction, SaveAllAction, SaveFileAction, MoveFileToTrashAction, TriggerRenameFileAction, PasteFileAction, CopyFileAction, NewFolderAction, NewFileAction, ShowActiveFileInExplorer, CollapseExplorerView, RefreshExplorerView, CompareWithSavedAction, CompareWithClipboardAction } from 'vs/workbench/parts/files/electron-browser/fileActions';
import { revertLocalChangesCommand, acceptLocalChangesCommand, CONFLICT_RESOLUTION_CONTEXT } from 'vs/workbench/parts/files/electron-browser/saveErrorHandler';
import { SyncActionDescriptor, MenuId, MenuRegistry } from 'vs/platform/actions/common/actions';
import { IWorkbenchActionRegistry, Extensions as ActionExtensions } from 'vs/workbench/common/actions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { FileStat, Model } from 'vs/workbench/parts/files/common/explorerModel';
import { KeyMod, KeyChord, KeyCode } from 'vs/base/common/keyCodes';
import { copyFocusedFilesExplorerViewItem, openWindowCommand, deleteFocusedFilesExplorerViewItemCommand, moveFocusedFilesExplorerViewItemToTrashCommand, renameFocusedFilesExplorerViewItemCommand, REVEAL_IN_OS_COMMAND_ID, COPY_PATH_COMMAND_ID, REVEAL_IN_EXPLORER_COMMAND_ID } from 'vs/workbench/parts/files/electron-browser/fileCommands';
import { CommandsRegistry, ICommandHandler } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { KeybindingsRegistry } from 'vs/platform/keybinding/common/keybindingsRegistry';
import { FilesExplorerFocusCondition, ExplorerRootContext, ExplorerFolderContext } from 'vs/workbench/parts/files/common/files';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL, REMOVE_ROOT_FOLDER_COMMAND_ID, REMOVE_ROOT_FOLDER_LABEL } from 'vs/workbench/browser/actions/workspaceCommands';
import { OPEN_FOLDER_SETTINGS_COMMAND, OPEN_FOLDER_SETTINGS_LABEL } from 'vs/workbench/parts/preferences/browser/preferencesActions';

class FilesViewerActionContributor extends ActionBarContributor {

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IKeybindingService private keybindingService: IKeybindingService
	) {
		super();
	}

	public hasSecondaryActions(context: any): boolean {
		const element = context.element;

		// Contribute only on Stat Objects (File Explorer)
		return element instanceof FileStat || element instanceof Model;
	}

	public getSecondaryActions(context: any): IAction[] {
		const stat = (<FileStat | Model>context.element);
		const tree = context.viewer;
		const actions: IAction[] = [];
		if (stat instanceof Model) {
			return [];
		}

		// Directory Actions
		if (stat.isDirectory && !stat.nonexistentRoot) {

			// New File
			actions.push(this.instantiationService.createInstance(NewFileAction, tree, <FileStat>stat));

			// New Folder
			actions.push(this.instantiationService.createInstance(NewFolderAction, tree, <FileStat>stat));

			actions.push(new Separator(null, 50));
		}

		// Copy File/Folder
		if (!stat.isRoot) {
			actions.push(this.instantiationService.createInstance(CopyFileAction, tree, <FileStat>stat));
		}

		// Paste File/Folder
		if (stat.isDirectory) {
			actions.push(this.instantiationService.createInstance(PasteFileAction, tree, <FileStat>stat));
		}

		// Rename File/Folder
		if (!stat.isRoot) {
			actions.push(new Separator(null, 150));
			actions.push(this.instantiationService.createInstance(TriggerRenameFileAction, tree, <FileStat>stat));
			// Delete File/Folder
			actions.push(this.instantiationService.createInstance(MoveFileToTrashAction, tree, <FileStat>stat));
		}

		// Set Order
		let curOrder = 10;
		for (let i = 0; i < actions.length; i++) {
			const action = <any>actions[i];
			if (!action.order) {
				curOrder += 10;
				action.order = curOrder;
			} else {
				curOrder = action.order;
			}
		}

		return actions;
	}

	public getActionItem(context: any, action: Action): BaseActionItem {
		if (context && context.element instanceof FileStat) {

			// Any other item with keybinding
			const keybinding = this.keybindingService.lookupKeybinding(action.id);
			if (keybinding) {
				return new ActionItem(context, action, { label: true, keybinding: keybinding.getLabel() });
			}
		}

		return null;
	}
}

// Contribute to Viewers that show Files
const actionBarRegistry = Registry.as<IActionBarRegistry>(ActionBarExtensions.Actionbar);
actionBarRegistry.registerActionBarContributor(Scope.VIEWER, FilesViewerActionContributor);

// Contribute Global Actions
const category = nls.localize('filesCategory', "File");

const registry = Registry.as<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
registry.registerWorkbenchAction(new SyncActionDescriptor(GlobalCopyPathAction, GlobalCopyPathAction.ID, GlobalCopyPathAction.LABEL, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_P) }), 'File: Copy Path of Active File', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(SaveFileAction, SaveFileAction.ID, SaveFileAction.LABEL), 'File: Save', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(SaveAllAction, SaveAllAction.ID, SaveAllAction.LABEL, { primary: void 0, mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_S }, win: { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_S) } }), 'File: Save All', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(SaveFilesAction, SaveFilesAction.ID, SaveFilesAction.LABEL), 'File: Save All Files', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(RevertFileAction, RevertFileAction.ID, RevertFileAction.LABEL), 'File: Revert File', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(GlobalNewFileAction, GlobalNewFileAction.ID, GlobalNewFileAction.LABEL), 'File: New File', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(GlobalNewFolderAction, GlobalNewFolderAction.ID, GlobalNewFolderAction.LABEL), 'File: New Folder', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(GlobalCompareResourcesAction, GlobalCompareResourcesAction.ID, GlobalCompareResourcesAction.LABEL), 'File: Compare Active File With...', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(FocusOpenEditorsView, FocusOpenEditorsView.ID, FocusOpenEditorsView.LABEL, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_E) }), 'File: Focus on Open Editors View', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(FocusFilesExplorer, FocusFilesExplorer.ID, FocusFilesExplorer.LABEL), 'File: Focus on Files Explorer', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(ShowActiveFileInExplorer, ShowActiveFileInExplorer.ID, ShowActiveFileInExplorer.LABEL), 'File: Reveal Active File in Side Bar', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(CollapseExplorerView, CollapseExplorerView.ID, CollapseExplorerView.LABEL), 'File: Collapse Folders in Explorer', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(RefreshExplorerView, RefreshExplorerView.ID, RefreshExplorerView.LABEL), 'File: Refresh Explorer', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(SaveFileAsAction, SaveFileAsAction.ID, SaveFileAsAction.LABEL, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_S }), 'File: Save As...', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(GlobalNewUntitledFileAction, GlobalNewUntitledFileAction.ID, GlobalNewUntitledFileAction.LABEL, { primary: KeyMod.CtrlCmd | KeyCode.KEY_N }), 'File: New Untitled File', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(GlobalRevealInOSAction, GlobalRevealInOSAction.ID, GlobalRevealInOSAction.LABEL, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_R) }), 'File: Reveal Active File', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(ShowOpenedFileInNewWindow, ShowOpenedFileInNewWindow.ID, ShowOpenedFileInNewWindow.LABEL, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_O) }), 'File: Open Active File in New Window', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(CompareWithSavedAction, CompareWithSavedAction.ID, CompareWithSavedAction.LABEL), 'File: Compare Active File with Saved', category);
registry.registerWorkbenchAction(new SyncActionDescriptor(CompareWithClipboardAction, CompareWithClipboardAction.ID, CompareWithClipboardAction.LABEL, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_C) }), 'File: Compare Active File with Clipboard', category);

// Commands
CommandsRegistry.registerCommand('_files.windowOpen', openWindowCommand);

const explorerCommandsWeightBonus = 10; // give our commands a little bit more weight over other default list/tree commands

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'renameFile',
	weight: KeybindingsRegistry.WEIGHT.workbenchContrib(explorerCommandsWeightBonus),
	when: FilesExplorerFocusCondition,
	primary: KeyCode.F2,
	mac: {
		primary: KeyCode.Enter
	},
	handler: renameFocusedFilesExplorerViewItemCommand
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'moveFileToTrash',
	weight: KeybindingsRegistry.WEIGHT.workbenchContrib(explorerCommandsWeightBonus),
	when: FilesExplorerFocusCondition,
	primary: KeyCode.Delete,
	mac: {
		primary: KeyMod.CtrlCmd | KeyCode.Backspace
	},
	handler: moveFocusedFilesExplorerViewItemToTrashCommand
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'deleteFile',
	weight: KeybindingsRegistry.WEIGHT.workbenchContrib(explorerCommandsWeightBonus),
	when: FilesExplorerFocusCondition,
	primary: KeyMod.Shift | KeyCode.Delete,
	mac: {
		primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.Backspace
	},
	handler: deleteFocusedFilesExplorerViewItemCommand
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'filesExplorer.copy',
	weight: KeybindingsRegistry.WEIGHT.workbenchContrib(explorerCommandsWeightBonus),
	when: FilesExplorerFocusCondition,
	primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
	handler: copyFocusedFilesExplorerViewItem
});

KeybindingsRegistry.registerCommandAndKeybindingRule({
	id: 'filesExplorer.paste',
	weight: KeybindingsRegistry.WEIGHT.workbenchContrib(explorerCommandsWeightBonus),
	when: FilesExplorerFocusCondition,
	primary: KeyMod.CtrlCmd | KeyCode.KEY_V,
	handler: pasteIntoFocusedFilesExplorerViewItem
});

// Editor Title Context Menu
appendEditorTitleContextMenuItem(REVEAL_IN_OS_COMMAND_ID, RevealInOSAction.LABEL);
appendEditorTitleContextMenuItem(COPY_PATH_COMMAND_ID, CopyPathAction.LABEL);
appendEditorTitleContextMenuItem(REVEAL_IN_EXPLORER_COMMAND_ID, nls.localize('revealInSideBar', "Reveal in Side Bar"));

function appendEditorTitleContextMenuItem(id: string, title: string): void {

	// Menu
	MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
		command: { id, title },
		when: ContextKeyExpr.equals('resourceScheme', 'file'),
		group: '2_files'
	});
}

// Editor Title Menu for Conflict Resolution
appendSaveConflictEditorTitleAction('workbench.files.action.acceptLocalChanges', nls.localize('acceptLocalChanges', "Use your changes and overwrite disk contents"), 'save-conflict-action-accept-changes', -10, acceptLocalChangesCommand);
appendSaveConflictEditorTitleAction('workbench.files.action.revertLocalChanges', nls.localize('revertLocalChanges', "Discard your changes and revert to content on disk"), 'save-conflict-action-revert-changes', -9, revertLocalChangesCommand);

function appendSaveConflictEditorTitleAction(id: string, title: string, iconClass: string, order: number, command: ICommandHandler): void {

	// Command
	CommandsRegistry.registerCommand(id, command);

	// Action
	MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
		command: { id, title, iconClass },
		when: ContextKeyExpr.equals(CONFLICT_RESOLUTION_CONTEXT, true),
		group: 'navigation',
		order
	});
}

// Explorer context menu

MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: '2_workspace',
	order: 10,
	command: {
		id: ADD_ROOT_FOLDER_COMMAND_ID,
		title: ADD_ROOT_FOLDER_LABEL
	},
	when: ExplorerRootContext
});

MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: '2_workspace',
	order: 20,
	command: {
		id: OPEN_FOLDER_SETTINGS_COMMAND,
		title: OPEN_FOLDER_SETTINGS_LABEL
	},
	when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext)
});

MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: '2_workspace',
	order: 30,
	command: {
		id: REMOVE_ROOT_FOLDER_COMMAND_ID,
		title: REMOVE_ROOT_FOLDER_LABEL
	},
	when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext)
});
