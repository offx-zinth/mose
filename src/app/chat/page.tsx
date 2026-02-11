'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, FileText, Upload, LogOut, MoreVertical, Heart, Sparkles, User, AlertTriangle, Trash2, AlertCircle, Smile, Edit2, Reply, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserInfo {
  id: string;
  name: string;
  emoji: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderEmoji?: string;
  content: string | null;
  messageType: 'text' | 'image' | 'video' | 'document';
  fileId: string | null;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  seen: boolean;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToSender?: string | null;
  replyToEmoji?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
}

interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

const FLOATING_EMOJIS = ['💗', '🎀', '✨', '🌸', '🌷', '🫧'];

// Unicode 17 Emojis organized by categories
const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
      '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐',
      '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦',
      '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
      '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
      '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
    ],
  },
  {
    name: 'Love',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
      '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
      '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
      '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
      '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
      '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️',
      '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓',
      '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️',
      '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠',
      'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂',
      '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦',
      '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙',
      '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣',
      '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️',
      '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️',
      '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️',
      '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄',
      '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲',
      '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛',
      '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵',
      '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷',
      '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧',
      '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉',
      '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️',
      '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓',
      '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝',
      '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧',
    ],
  },
  {
    name: 'People',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
      '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝',
      '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '🦻', '👃',
      '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '👶',
      '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴',
      '👵', '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🙇', '🤦', '🤷',
      '👨‍⚕️', '👩‍⚕️', '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍⚖️', '👩‍⚖️', '👨‍🌾', '👩‍🌾',
      '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬',
      '👨‍💻', '👩‍💻', '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀',
      '👨‍🚒', '👩‍🚒', '👮', '🕵️', '💂', '👷', '🤴', '👸', '👳', '👲',
      '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🧑‍🎄', '🦸',
      '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇',
      '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '🕴️', '👯', '🧖', '🧘',
      '🧗', '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏄', '🚣', '🏊', '⛹️',
      '🏋️', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🛀', '🛌',
      '👭', '👫', '👬', '💏', '💑', '👪', '🗣️', '👤', '👥', '👣',
    ],
  },
  {
    name: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
      '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
      '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
      '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛',
      '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖',
      '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈',
      '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🐇', '🦝', '🦨', '🦡',
      '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔',
    ],
  },
  {
    name: 'Food',
    icon: '🍕',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
      '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
      '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐',
      '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇',
      '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪',
      '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲',
      '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥',
      '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰',
      '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜',
      '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻',
      '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴',
      '🍽️', '🥣', '🥡', '🥢', '🧂', '⚽', '🏀', '🏈', '⚾', '🥎',
      '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑',
      '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋',
      '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️',
      '🤼', '🤸', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽',
      '🚣', '🧗', '🚴', '🚵', '🎖️', '🏅', '🥇', '🥈', '🥉', '🏆',
      '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬',
      '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻',
      '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩',
    ],
  },
  {
    name: 'Travel',
    icon: '✈️',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️',
      '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃',
      '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊',
      '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁',
      '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧',
      '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️',
      '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️',
      '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭',
      '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩',
      '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️',
      '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆',
      '🏙️', '🌃', '🌌', '🌉', '🌁', '🌂', '☔', '⚡', '❄️', '☃️',
      '⛄', '☄️', '🔥', '💧', '🌊',
    ],
  },
  {
    name: 'Objects',
    icon: '💡',
    emojis: [
      '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊', '🎋',
      '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗️', '🎟️',
      '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎',
      '🏀', '🏐', '🏈', '🏉', '🎾', '🥏', '🎳', '🏏', '🏑', '🏒',
      '🥍', '🏓', '🏸', '🥊', '🥋', '🥅', '⛳', '⛸️', '🎣', '🤿',
      '🎽', '🎿', '🛷', '🥌', '🎯', '🪀', '🪁', '🎱', '🔮', '🧿',
      '🎮', '🕹️', '🎰', '🎲', '🧩', '🧸', '🪅', '🪆', '♠️', '♥️',
      '♦️', '♣️', '♟️', '🃏', '🀄', '🎴', '🎭', '🖼️', '🎨', '🧵',
      '🪡', '🧶', '🪢', '👓', '🕶️', '🥽', '🥼', '🦺', '👔', '👕',
      '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲',
      '🩳', '👙', '👚', '👛', '👜', '👝', '🛍️', '🎒', '🩴', '👞',
      '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩',
      '🎓', '🧢', '⛑️', '📿', '💄', '💍', '💎', '🔇', '🔈', '🔉',
      '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎼', '🎵', '🎶', '🎙️',
      '🎚️', '🎛️', '🎤', '🎧', '📻', '🎷', '🎸', '🎹', '🎺', '🎻',
      '🪕', '🥁', '📱', '📲', '☎️', '📞', '📟', '📠', '🔋', '🔌',
      '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀',
      '🧮', '🎥', '🎞️', '📽️', '🎬', '📺', '📷', '📸', '📹', '📼',
      '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖',
      '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰',
      '🗞️', '📑', '🔖', '🏷️', '💰', '💴', '💵', '💶', '💷', '💸',
      '💳', '🧾', '💹', '✉️', '📧', '📨', '📩', '📤', '📥', '📦',
      '📫', '📪', '📬', '📭', '📮', '🗳️', '✏️', '✒️', '🖋️', '🖊️',
      '🖌️', '🖍️', '📝', '💼', '📁', '📂', '🗂️', '📅', '📆', '🗒️',
      '🗓️', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇️',
      '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔏', '🔐',
      '🔑', '🗝️', '🔨', '🪓', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '🔫',
      '🏹', '🛡️', '🔧', '🔩', '⚙️', '🗜️', '⚖️', '🦯', '🔗', '⛓️',
      '🧰', '🧲', '⚗️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉',
      '🩸', '💊', '🩹', '🩺', '🚪', '🛗', '🪞', '🪟', '🛏️', '🛋️',
      '🪑', '🚽', '🪠', '🚿', '🛁', '🪤', '🪒', '🧴', '🧷', '🧹',
      '🧺', '🧻', '🧼', '🧽', '🧯', '🛒', '🎁', '🎈', '🎏', '🎀',
      '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✨', '🎇', '🎆', '📇',
    ],
  },
  {
    name: 'Symbols',
    icon: '⭐',
    emojis: [
      '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂',
      '🛃', '🛄', '🛅', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯',
      '🚱', '🚷', '📵', '🔞', '☢️', '☣️', '⬆️', '↗️', '➡️', '↘️',
      '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️',
      '🔃', '🔄', '🔙', '🔚', '🔛', '🔜', '🔝', '🛐', '⚛️', '🕉️',
      '✡️', '☸️', '☯️', '✝️', '☦️', '☪️', '☮️', '🕎', '🔯', '♈',
      '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒',
      '♓', '⛎', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️',
      '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '⏏️',
      '🎦', '🔅', '🔆', '📶', '📳', '📴', '♀️', '♂️', '⚕️', '♾️',
      '♻️', '⚜️', '🔱', '📛', '🔰', '⭕', '✅', '☑️', '✔️', '✖️',
      '❌', '❎', '➕', '➖', '➗', '➰', '➿', '〽️', '✳️', '✴️',
      '❇️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '©️', '®️',
      '™️', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣',
      '7️⃣', '8️⃣', '9️⃣', '🔟', '🔠', '🔡', '🔢', '🔣', '🔤', '🅰️',
      '🆎', '🅱️', '🆑', '🆒', '🆓', 'ℹ️', '🆔', 'Ⓜ️', '🆕', '🆖',
      '🅾️', '🆗', '🅿️', '🆘', '🆙', '🆚', '🈁', '🈂️', '🈷️', '🈶',
      '🈯', '🉐', '🈹', '🈚', '🈲', '🉑', '🈸', '🈴', '🈳', '㊗️',
      '㊙️', '🈺', '🈵', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤',
      '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛',
      '⬜', '◼️', '◻️', '◾', '◽', '▪️', '▫️', '🔶', '🔷', '🔸',
      '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲', '🏁', '🚩', '🎌',
      '🏴', '🏳️', '🏳️‍🌈', '🏴‍☠️', '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮',
    ],
  },
];

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [setupStatus, setSetupStatus] = useState<{isSetupComplete: boolean; messagesTable: boolean; storageBucket: boolean} | null>(null);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteDialogOpenOwn, setDeleteDialogOpenOwn] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{emoji: string; left: string; top: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const WEBSOCKET_PORT = 3003;
  const INACTIVITY_TIMEOUT = 60 * 1000; // 1 minute
  const LONG_PRESS_DURATION = 600; // 600ms for long press

  // Inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setInactivityWarning(false);
    setTimeLeft(60);

    inactivityTimerRef.current = setTimeout(() => {
      setInactivityWarning(true);
      const countdown = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            window.location.href = 'https://www.wikipedia.org';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - 10000); // Show warning 10 seconds before redirect

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (countdown) clearInterval(countdown);
    };
  }, []);

  // Reset timer on user activity
  useEffect(() => {
    const handleActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [resetInactivityTimer]);

  // Generate random floating emoji positions after mount
  useEffect(() => {
    const emojis = [...Array(25)].map((_, i) => ({
      emoji: FLOATING_EMOJIS[i % FLOATING_EMOJIS.length],
      left: `${Math.random() * 95}%`,
      top: `${Math.random() * 95}%`,
    }));
    setFloatingEmojis(emojis);
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('chat-user');
    if (!userStr) {
      router.push('/');
      return;
    }

    try {
      const userData: UserInfo = JSON.parse(userStr);
      setUser(userData);
    } catch (err) {
      console.error('Failed to parse user data:', err);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const socketInstance = io(`/?XTransformPort=${WEBSOCKET_PORT}`, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to chat server');

      // Join chat
      socketInstance.emit('join_chat', {
        userId: user.id,
        userName: user.name,
      });

      // Add self to online users immediately
      setOnlineUsers(new Set([user.id]));
    });

    socketInstance.on('message', (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socketInstance.on('message_seen', (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, seen: true } : m))
      );
    });

    // Receive initial list of online users
    socketInstance.on('online_users', (users: { userId: string; userName: string }[]) => {
      const userIdSet = new Set(users.map(u => u.userId));
      console.log('Online users:', users);
      setOnlineUsers(userIdSet);
    });

    socketInstance.on('user_joined', (data: { userId: string; userName: string }) => {
      console.log(`User ${data.userName} joined`);
      setOnlineUsers(prev => new Set(prev).add(data.userId));
    });

    socketInstance.on('user_left', (data: { userId: string; userName: string }) => {
      console.log(`User ${data.userName} left`);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socketInstance.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, WEBSOCKET_PORT]);

  // Check setup status
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/setup');
        const data = await response.json();
        setSetupStatus(data);
      } catch (err) {
        console.error('Failed to check setup:', err);
      }
    };
    checkSetup();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages?limit=50');
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (socket && messages.length > 0 && user) {
      const unseenMessages = messages.filter((m) => m.senderId !== user.id && !m.seen);
      unseenMessages.forEach((m) => {
        socket.emit('mark_seen', m.id);
      });
    }
  }, [messages, socket, user]);

  const handleSendMessage = async () => {
    if (!input.trim() || sending || !socket || !user) return;

    setSending(true);
    const messageContent = input.trim();
    setInput('');
    setReplyingTo(null);

    try {
      socket.emit('send_message', {
        senderId: user.id,
        senderName: user.name,
        senderEmoji: user.emoji,
        content: messageContent,
        messageType: 'text' as const,
        fileId: null,
        replyToId: replyingTo?.id || null,
      });

      await fetch('/api/messages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.name,
          senderEmoji: user.emoji,
          content: messageContent,
          messageType: 'text',
          replyToId: replyingTo?.id || null,
        }),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (uploading || !user) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.file) {
        const fileMetadata: FileMetadata = data.file;
        let messageType: 'image' | 'video' | 'document' = 'document';

        if (fileMetadata.mimeType.startsWith('image/')) {
          messageType = 'image';
        } else if (fileMetadata.mimeType.startsWith('video/')) {
          messageType = 'video';
        }

        if (socket) {
          socket.emit('send_message', {
            senderId: user.id,
            senderName: user.name,
            senderEmoji: user.emoji,
            content: null,
            messageType,
            fileId: fileMetadata.id,
            fileUrl: fileMetadata.storagePath,
            fileName: fileMetadata.originalName,
          });
        }

        await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            senderName: user.name,
            senderEmoji: user.emoji,
            content: null,
            messageType,
            fileId: fileMetadata.id,
            fileUrl: fileMetadata.storagePath,
            fileName: fileMetadata.originalName,
          }),
        });
      } else {
        alert(data.error || 'Failed to upload file, my love!');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file, darling!');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chat-user');
    router.push('/');
  };

  const handlePanic = () => {
    window.location.href = 'https://www.wikipedia.org';
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId: user.id }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        setDeleteDialogOpen(false);
        setMessageToDelete(null);
      } else {
        alert(data.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Delete message error:', err);
      alert('Failed to delete message');
    }
  };

  const handleEditMessage = async () => {
    if (!messageToEdit || !user) return;

    try {
      const response = await fetch('/api/messages/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: messageToEdit.id,
          userId: user.id,
          newContent: editContent,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageToEdit.id
              ? { ...m, content: editContent, isEdited: true, editedAt: new Date().toISOString() }
              : m
          )
        );
        setEditDialogOpen(false);
        setMessageToEdit(null);
        setEditContent('');
      } else {
        alert(data.error || 'Failed to edit message');
      }
    } catch (err) {
      console.error('Edit message error:', err);
      alert('Failed to edit message');
    }
  };

  const handleDeleteAllMessages = async (action: 'mine' | 'all') => {
    if (!user) return;

    try {
      const response = await fetch('/api/messages/delete-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action }),
      });

      const data = await response.json();

      if (data.success) {
        if (action === 'mine') {
          setMessages((prev) => prev.filter((m) => m.senderId !== user.id));
        } else {
          setMessages([]);
        }
        setDeleteAllDialogOpen(false);
        setDeleteDialogOpenOwn(false);
      } else {
        alert(data.error || 'Failed to delete messages');
      }
    } catch (err) {
      console.error('Delete messages error:', err);
      alert('Failed to delete messages');
    }
  };

  const handleLongPressStart = (message: Message, action: 'delete' | 'edit') => {
    if (message.senderId !== user?.id) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      if (action === 'delete') {
        setMessageToDelete(message.id);
        setDeleteDialogOpen(true);
      } else if (action === 'edit' && message.messageType === 'text') {
        setMessageToEdit(message);
        setEditContent(message.content || '');
        setEditDialogOpen(true);
      }
    }, LONG_PRESS_DURATION);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderMessageContent = (message: Message) => {
    if (message.messageType === 'text') {
      return (
        <p className="break-words whitespace-pre-wrap">{message.content}</p>
      );
    }

    if (message.messageType === 'image' && message.fileUrl) {
      return (
        <div className="space-y-2">
          <img
            src={message.fileUrl}
            alt={message.fileName}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.fileUrl, '_blank')}
          />
        </div>
      );
    }

    if (message.messageType === 'video' && message.fileUrl) {
      return (
        <div className="space-y-2">
          <video
            src={message.fileUrl}
            controls
            className="max-w-full rounded-lg"
          />
        </div>
      );
    }

    if (message.messageType === 'document' && message.fileName) {
      return (
        <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
          <FileText className="w-8 h-8 flex-shrink-0 text-pink-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-pink-100">{message.fileName}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-pink-500/50 hover:bg-pink-900/30 text-pink-300"
            onClick={() => window.open(message.fileUrl, '_blank')}
          >
            Download
          </Button>
        </div>
      );
    }

    return null;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950 relative overflow-hidden">
        {/* Floating emojis for loading screen */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`loading-${i}`}
            className="absolute text-4xl animate-bounce pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              filter: 'blur(1px)',
              opacity: 0.3,
            }}
          >
            {FLOATING_EMOJIS[i % FLOATING_EMOJIS.length]}
          </div>
        ))}
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-pink-300">Loading our chat... 💕</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950 relative overflow-hidden">
      {/* Floating Emojis Background - Random positions with movement */}
      {floatingEmojis.map((item, i) => (
        <div
          key={`floating-${i}`}
          className="absolute text-3xl pointer-events-none select-none"
          style={{
            left: item.left,
            top: item.top,
            animation: `floatAndPulse ${6 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
              filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.6))',
              opacity: 0.5,
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Inactivity Warning */}
      {inactivityWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-900/90 backdrop-blur-md border border-red-500/50 rounded-lg p-4 max-w-md">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-white font-semibold">Redirecting in {timeLeft} seconds...</p>
                <p className="text-red-200 text-sm">Click anywhere to stay</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header - Fixed at top */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-pink-900/30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Our Chat 💕
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-pink-300/70">
                  {onlineUsers.size > 1 ? '🟢 Online together' : user && onlineUsers.has(user.id) ? '🟢 Online' : '💤 Offline'}
                </span>
                <span className="text-pink-700">•</span>
                <span className="text-sm text-pink-400 font-medium">
                  {user?.emoji} {user?.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Panic Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePanic}
              className="border-red-500/50 text-red-400 hover:bg-red-900/30 hover:text-red-300"
              title="Panic - Go to Wikipedia"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Panic
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-pink-300 hover:text-pink-100">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpenOwn(true)}
                  className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteAllDialogOpen(true)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/30 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages - With padding for fixed header and footer */}
      <main className="flex-1 overflow-y-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Setup Warning */}
          {setupStatus && !setupStatus.isSetupComplete && (
            <div className="p-4 bg-yellow-900/30 backdrop-blur-md border border-yellow-600/50 rounded-lg">
              <h3 className="text-yellow-300 font-semibold mb-2">⚠️ Setup Required</h3>
              <p className="text-yellow-200/80 text-sm mb-3">
                Some Supabase resources need to be created for the chat to work properly:
              </p>
              <ul className="text-sm space-y-1 text-yellow-200/70">
                {!setupStatus.messagesTable && (
                  <li>• <strong>Messages table</strong> - Create in Supabase Table Editor</li>
                )}
                {!setupStatus.storageBucket && (
                  <li>• <strong>Storage bucket</strong> - Create 'chat-files' bucket in Supabase Storage</li>
                )}
              </ul>
              <p className="text-xs text-yellow-300/60 mt-3">
                See SUPABASE_SETUP.md for detailed instructions.
              </p>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center py-12 relative">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
                  <Heart className="w-12 h-12 text-pink-400 fill-pink-400/30" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-pink-300 font-medium text-lg">No messages yet, my love 💕</p>
              <p className="text-sm text-pink-400/60 mt-2">
                Start the conversation with something sweet!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user.id;
              const displayName = message.senderName || (isOwn ? user.name : 'My Love');
              const emoji = message.senderEmoji || (isOwn ? user.emoji : '💕');

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[70%] space-y-1 ${
                      isOwn ? 'items-end' : 'items-start'
                    } flex flex-col`}
                  >
                    {!isOwn && message.senderName && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-sm">{emoji}</span>
                        <span className="text-xs text-pink-400 font-medium">
                          {message.senderName}
                        </span>
                      </div>
                    )}

                    <div className="relative">
                      <Card
                        className={`p-0 overflow-hidden backdrop-blur-md transition-all ${
                          isOwn
                            ? 'bg-gradient-to-br from-pink-600/80 to-purple-600/80 text-white border-0 shadow-xl shadow-pink-900/20 border border-white/10'
                            : 'bg-slate-800/60 backdrop-blur-md border-pink-900/30 border border-white/10'
                        }`}
                        onMouseDown={() => handleLongPressStart(message, 'delete')}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(message, 'delete')}
                        onTouchEnd={handleLongPressEnd}
                        title={isOwn ? 'Long press to delete/edit' : ''}
                      >
                        {/* Reply preview - Inside the message bubble (WhatsApp style) */}
                        {message.replyToId && (
                          <div
                            className={`flex items-start gap-2 px-4 py-2 border-b ${
                              isOwn
                                ? 'bg-white/10 border-white/20'
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <Reply className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-300" />
                            <div className="flex-1 min-w-0">
                              {/* Reply to sender info */}
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-semibold text-purple-300">
                                  {message.replyToSender || 'Someone'}
                                </span>
                                {message.replyToEmoji && (
                                  <span className="text-xs">{message.replyToEmoji}</span>
                                )}
                              </div>
                              {/* Quoted message */}
                              <p className="text-xs text-white/60 truncate">
                                {message.replyToContent || '...'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Main message content */}
                        <div className="p-4">
                          {renderMessageContent(message)}

                          {message.isEdited && (
                            <p className="text-xs text-white/50 mt-2 italic">
                              ✏️ Edited {message.editedAt && formatTime(message.editedAt)}
                            </p>
                          )}
                        </div>
                      </Card>

                      {/* Action buttons for own messages */}
                      {isOwn && message.messageType === 'text' && (
                        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMessageToEdit(message);
                              setEditContent(message.content || '');
                              setEditDialogOpen(true);
                            }}
                            className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg"
                            title="Edit message"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {/* Reply button for all messages */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(message);
                        }}
                        className="absolute -bottom-2 -right-2 h-7 w-7 p-0 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs text-pink-400/50">
                        {formatTime(message.createdAt)}
                      </span>
                      {isOwn && message.seen && (
                        <span className="text-xs text-pink-400/50">
                          Seen 💕
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Chat Input - Fixed at bottom */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/80 backdrop-blur-xl border-t border-pink-900/30 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Reply preview - WhatsApp style in input area */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-3 mb-2 px-4 py-2 bg-purple-900/30 rounded-lg border border-purple-700/50 backdrop-blur-sm">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Reply className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-300" />
                <div className="flex-1 min-w-0">
                  {/* Sender info */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-purple-300">
                      Replying to {replyingTo.senderName || 'them'}
                    </span>
                    {replyingTo.senderEmoji && (
                      <span className="text-xs">{replyingTo.senderEmoji}</span>
                    )}
                  </div>
                  {/* Quoted message */}
                  <p className="text-xs text-white/60 truncate">
                    {replyingTo.content || '...'}
                  </p>
                </div>
              </div>
              {/* Cancel button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="flex-shrink-0 h-6 w-6 p-0 text-purple-400/70 hover:text-purple-300 hover:bg-purple-900/50 rounded-full"
              >
                ✕
              </Button>
            </div>
          )}

          {/* Emoji picker with categories */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 right-4 bg-slate-800/95 backdrop-blur-xl border border-pink-900/50 rounded-lg p-3 max-w-2xl mx-auto z-50 shadow-2xl">
              {/* Category tabs */}
              <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-2 border-b border-white/10">
                {EMOJI_CATEGORIES.map((category, index) => (
                  <button
                    key={`cat-${index}`}
                    onClick={() => setSelectedCategory(index)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-2xl transition-all ${
                      selectedCategory === index
                        ? 'bg-pink-600/30 ring-2 ring-pink-500'
                        : 'hover:bg-white/10'
                    }`}
                    title={category.name}
                  >
                    {category.icon}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto custom-scrollbar">
                {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji, index) => (
                  <button
                    key={`${selectedCategory}-${index}`}
                    onClick={() => {
                      setInput((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="text-2xl p-2 hover:bg-pink-900/30 rounded-lg transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="border-pink-700/50 hover:bg-pink-900/30 text-pink-300 backdrop-blur-sm"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`border-pink-700/50 hover:bg-pink-900/30 text-pink-300 backdrop-blur-sm ${
                showEmojiPicker ? 'bg-pink-900/30' : ''
              }`}
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say something sweet, my love... 💕"
              className="flex-1 bg-slate-800/50 backdrop-blur-sm border-pink-700/50 text-pink-100 placeholder:text-pink-600 focus-visible:ring-pink-500"
              disabled={sending || uploading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || sending || uploading}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 backdrop-blur-sm"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </footer>

      {/* Delete Message Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Delete this message?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">
              This action cannot be undone. The message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300 hover:bg-pink-900/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Message Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Edit Message</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">
              Make changes to your message below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-32 bg-slate-800/50 border-pink-700/50 rounded-lg p-3 text-pink-100 placeholder:text-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Edit your message..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300 hover:bg-pink-900/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditMessage}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!editContent.trim()}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Messages Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete All Messages?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">
              This will delete ALL messages for both users. This action cannot be undone!
              <br /><br />
              <strong className="text-red-400">This is a destructive action!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300 hover:bg-pink-900/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteAllMessages('all')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Own Messages Dialog */}
      <AlertDialog open={deleteDialogOpenOwn} onOpenChange={setDeleteDialogOpenOwn}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Delete Your Messages?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">
              This will delete only YOUR messages from the chat. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300 hover:bg-pink-900/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteAllMessages('mine')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete My Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        @keyframes floatAndPulse {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1) rotate(0deg);
            opacity: 0.5;
          }
          25% {
            transform: translateY(-30px) translateX(10px) scale(1.1) rotate(5deg);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-15px) translateX(-10px) scale(1.05) rotate(-5deg);
            opacity: 0.6;
          }
          75% {
            transform: translateY(-40px) translateX(5px) scale(1.15) rotate(3deg);
            opacity: 0.8;
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.3);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.5);
        }
      `}</style>
    </div>
  );
}
