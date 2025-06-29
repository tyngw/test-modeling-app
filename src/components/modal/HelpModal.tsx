import React from 'react';
import ModalWindow from './ModalWindow';
import HelpIcon from '../icons/HelpIcon';
import { helpSections, type HelpSection } from '../../constants/helpContent';
import { Action } from '../../types/actionTypes';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch: React.Dispatch<Action>;
  modalId?: string;
  onOpen?: () => void;
}

/**
 * ヘルプモーダルコンポーネント
 * XSS攻撃を防ぐため、dangerouslySetInnerHTMLの代わりに
 * 構造化されたデータを使用して安全にレンダリング
 */
const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, dispatch, modalId, onOpen }) => {
  return (
    <ModalWindow
      isOpen={isOpen}
      onClose={onClose}
      title="ヘルプ"
      icon={<HelpIcon />}
      dispatch={dispatch}
      modalId={modalId}
      onOpen={onOpen}
    >
      <div className="space-y-6">
        {helpSections.map((section: HelpSection, sectionIndex) => (
          <div key={sectionIndex} className="space-y-2">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {section.title}
            </h4>
            <div className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <p key={itemIndex} className="text-sm text-gray-600 dark:text-gray-400">
                  {item}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ModalWindow>
  );
};

export default HelpModal;
