'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Send, FileText, Upload, LogOut, MoreVertical, Heart, Sparkles, AlertTriangle,
  Trash2, Smile, Edit2, Reply, Phone, Video, Users, X, Mic,
  MicOff, PhoneOff, Monitor, Tv
} from 'lucide-react';
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

interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderEmoji?: string;
  content: string | null;
  messageType: 'text' | 'image' | 'video' | 'document' | 'voice';
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
  voiceDuration?: number;
  reactions?: Reaction[];
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
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];
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
const WEBSOCKET_PORT = 3003;
const INACTIVITY_TIMEOUT = 60 * 1000;
const LONG_PRESS_DURATION = 500;

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

  // Action menu state - shows on long press
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Call state
  const [callState, setCallState] = useState<{
    type: 'voice' | 'video' | 'screen' | null;
    status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
    otherUserId: string | null;
  }>({ type: null, status: 'idle', otherUserId: null });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  // Watch together state
  const [watchTogether, setWatchTogether] = useState<{
    active: boolean;
    videoUrl: string;
    isPlaying: boolean;
    currentTime: number;
    hostId: string | null;
  }>({ active: false, videoUrl: '', isPlaying: false, currentTime: 0, hostId: null });
  const [showWatchTogether, setShowWatchTogether] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

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
    }, INACTIVITY_TIMEOUT - 10000);

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // Reset timer on user activity
  useEffect(() => {
    const handleActivity = () => resetInactivityTimer();
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
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Generate floating emojis
  useEffect(() => {
    const emojis = [...Array(25)].map((_, i) => ({
      emoji: FLOATING_EMOJIS[i % FLOATING_EMOJIS.length],
      left: `${Math.random() * 95}%`,
      top: `${Math.random() * 95}%`,
    }));
    setFloatingEmojis(emojis);
  }, []);

  // Load user
  useEffect(() => {
    const userStr = localStorage.getItem('chat-user');
    if (!userStr) {
      router.push('/');
      return;
    }
    try {
      const userData: UserInfo = JSON.parse(userStr);
      setUser(userData);
    } catch {
      router.push('/');
    }
  }, [router]);

  // Socket connection
  useEffect(() => {
    if (!user) return;

    const socketInstance = io(`/?XTransformPort=${WEBSOCKET_PORT}`, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      socketInstance.emit('join_chat', { userId: user.id, userName: user.name });
      setOnlineUsers(new Set([user.id]));
    });

    socketInstance.on('message', (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socketInstance.on('message_seen', (messageId: string) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, seen: true } : m));
    });

    socketInstance.on('message_updated', (data: Partial<Message> & { id: string }) => {
      setMessages((prev) => prev.map((m) => m.id === data.id ? { ...m, ...data } : m));
    });

    socketInstance.on('message_deleted', (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socketInstance.on('message_reaction', (data: { messageId: string; reactions: Reaction[] }) => {
      setMessages((prev) => prev.map((m) => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
    });

    socketInstance.on('online_users', (users: { userId: string; userName: string }[]) => {
      setOnlineUsers(new Set(users.map(u => u.userId)));
    });

    socketInstance.on('user_joined', (data: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId));
    });

    socketInstance.on('user_left', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    // WebRTC signaling
    socketInstance.on('call_signal', async (signal) => {
      if (signal.type === 'call-start') {
        setCallState({ type: signal.callType || 'voice', status: 'ringing', otherUserId: signal.from });
      } else if (signal.type === 'call-decline') {
        endCall();
      } else if (signal.type === 'call-end') {
        endCall();
      } else if (signal.type === 'answer' && peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data));
      } else if (signal.type === 'offer') {
        const pc = new RTCPeerConnection(rtcConfig);
        setPeerConnection(pc);

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketInstance.emit('call_signal', {
              type: 'ice-candidate',
              from: user.id,
              to: signal.from,
              data: event.candidate,
            });
          }
        };

        pc.ontrack = (event) => {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketInstance.emit('call_signal', {
          type: 'answer',
          from: user.id,
          to: signal.from,
          data: answer,
        });
      } else if (signal.type === 'ice-candidate' && peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(signal.data));
      }
    });

    // Watch together signaling
    socketInstance.on('watch_together', (signal) => {
      if (signal.type === 'join' || signal.type === 'sync') {
        setWatchTogether(prev => ({
          ...prev,
          active: true,
          videoUrl: signal.data.videoUrl || prev.videoUrl,
          currentTime: signal.data.currentTime || 0,
          isPlaying: signal.data.isPlaying ?? prev.isPlaying,
          hostId: signal.from,
        }));
      } else if (signal.type === 'play') {
        setWatchTogether(prev => ({ ...prev, isPlaying: true }));
      } else if (signal.type === 'pause') {
        setWatchTogether(prev => ({ ...prev, isPlaying: false }));
      } else if (signal.type === 'seek') {
        setWatchTogether(prev => ({ ...prev, currentTime: signal.data.currentTime || 0 }));
      }
    });

    setSocket(socketInstance);
    return () => socketInstance.disconnect();
  }, [user]);

  // Load messages
  useEffect(() => {
    if (!user) return;
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages?limit=100');
        const data = await response.json();
        if (data.success) setMessages(data.messages);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as seen
  useEffect(() => {
    if (socket && messages.length > 0 && user) {
      messages.filter(m => m.senderId !== user.id && !m.seen).forEach(m => {
        socket.emit('mark_seen', m.id);
      });
    }
  }, [messages, socket, user]);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || sending || !socket || !user) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const replyTo = replyingTo;
    setReplyingTo(null);

    socket.emit('send_message', {
      senderId: user.id,
      senderName: user.name,
      senderEmoji: user.emoji,
      content,
      messageType: 'text',
      fileId: null,
      replyToId: replyTo?.id || null,
    });

    await fetch('/api/messages/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: user.id,
        senderName: user.name,
        senderEmoji: user.emoji,
        content,
        messageType: 'text',
        replyToId: replyTo?.id || null,
      }),
    });

    setSending(false);
  };

  const handleFileUpload = async (file: File) => {
    if (uploading || !user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (data.success && data.file) {
        const fileMetadata: FileMetadata = data.file;
        let messageType: 'image' | 'video' | 'document' = 'document';
        if (fileMetadata.mimeType.startsWith('image/')) messageType = 'image';
        else if (fileMetadata.mimeType.startsWith('video/')) messageType = 'video';

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
            messageType,
            fileId: fileMetadata.id,
            fileUrl: fileMetadata.storagePath,
            fileName: fileMetadata.originalName,
          }),
        });
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleVoiceUpload(file, recordingTime);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleVoiceUpload = async (file: File, duration: number) => {
    if (!user || !socket) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (data.success && data.file) {
        socket.emit('send_message', {
          senderId: user.id,
          senderName: user.name,
          senderEmoji: user.emoji,
          content: null,
          messageType: 'voice',
          fileId: data.file.id,
          fileUrl: data.file.storagePath,
          voiceDuration: duration,
        });

        await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            senderName: user.name,
            senderEmoji: user.emoji,
            messageType: 'voice',
            fileId: data.file.id,
            fileUrl: data.file.storagePath,
            voiceDuration: duration,
          }),
        });
      }
    } catch (err) {
      console.error('Voice upload error:', err);
    }
  };

  // Call functions
  const startCall = async (type: 'voice' | 'video') => {
    if (!socket || !user) return;
    const otherUserId = Array.from(onlineUsers).find(id => id !== user.id);
    if (!otherUserId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(rtcConfig);
      setPeerConnection(pc);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call_signal', {
            type: 'ice-candidate',
            from: user.id,
            to: otherUserId,
            data: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_signal', {
        type: 'call-start',
        from: user.id,
        to: otherUserId,
        callType: type,
        data: offer,
      });

      setCallState({ type, status: 'calling', otherUserId });

      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: user.id,
          callerName: user.name,
          receiverId: otherUserId,
          callType: type,
          status: 'calling',
        }),
      });
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  };

  const answerCall = async () => {
    if (!socket || !user || !callState.otherUserId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.type === 'video',
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCallState(prev => ({ ...prev, status: 'connected' }));

      await fetch('/api/calls', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: callState.otherUserId, status: 'answered' }),
      });
    } catch (err) {
      console.error('Failed to answer call:', err);
    }
  };

  const declineCall = () => {
    if (socket && callState.otherUserId) {
      socket.emit('call_signal', {
        type: 'call-decline',
        from: user?.id,
        to: callState.otherUserId,
      });
    }
    endCall();
  };

  const endCall = () => {
    localStream?.getTracks().forEach(t => t.stop());
    remoteStream?.getTracks().forEach(t => t.stop());
    peerConnection?.close();
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
    setCallState({ type: null, status: 'idle', otherUserId: null });
  };

  // Screen sharing
  const startScreenShare = async () => {
    if (!socket || !user) return;
    const otherUserId = Array.from(onlineUsers).find(id => id !== user.id);
    if (!otherUserId) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection(rtcConfig);
      setPeerConnection(pc);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call_signal', {
            type: 'ice-candidate',
            from: user.id,
            to: otherUserId,
            data: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_signal', {
        type: 'call-start',
        from: user.id,
        to: otherUserId,
        callType: 'screen',
        data: offer,
      });

      setCallState({ type: 'screen', status: 'connected', otherUserId });
    } catch (err) {
      console.error('Failed to share screen:', err);
    }
  };

  // Reactions
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    setShowActionMenu(null);

    const response = await fetch('/api/messages/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, userId: user.id, emoji }),
    });
    const data = await response.json();

    if (data.success) {
      // Immediately update local state
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: data.reactions } : m
      ));

      // Broadcast to other users
      if (socket) {
        socket.emit('react_message', { messageId, emoji, userId: user.id });
      }
    }
  };

  // Watch together
  const startWatchTogether = async (videoUrl: string) => {
    if (!socket || !user) return;

    setWatchTogether({ active: true, videoUrl, isPlaying: false, currentTime: 0, hostId: user.id });
    setShowWatchTogether(false);

    await fetch('/api/watch-together', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        hostId: user.id,
        hostName: user.name,
        videoUrl,
      }),
    });

    socket.emit('watch_together', {
      type: 'join',
      from: user.id,
      data: { videoUrl, currentTime: 0, isPlaying: false },
    });
  };

  const syncWatchTogether = (currentTime: number, isPlaying: boolean) => {
    if (!socket || !user) return;

    setWatchTogether(prev => ({ ...prev, currentTime, isPlaying }));

    socket.emit('watch_together', {
      type: isPlaying ? 'play' : 'pause',
      from: user.id,
      data: { currentTime, isPlaying },
    });
  };

  const endWatchTogether = async () => {
    if (socket) {
      socket.emit('watch_together', { type: 'leave', from: user?.id || '', data: {} });
    }
    await fetch('/api/watch-together', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'end' }),
    });
    setWatchTogether({ active: false, videoUrl: '', isPlaying: false, currentTime: 0, hostId: null });
  };

  // Long press handler - shows action menu
  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent, message: Message) => {
    e.preventDefault();
    
    longPressTimerRef.current = setTimeout(() => {
      // Get position for the menu
      let x = 0, y = 0;
      if ('touches' in e) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      
      setActionMenuPosition({ x, y });
      setShowActionMenu(message.id);
    }, LONG_PRESS_DURATION);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    const response = await fetch('/api/messages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, userId: user.id }),
    });
    const data = await response.json();
    if (data.success) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (socket) socket.emit('delete_message', messageId);
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      setShowActionMenu(null);
    }
  };

  const handleEditMessage = async () => {
    if (!messageToEdit || !user) return;
    const response = await fetch('/api/messages/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: messageToEdit.id, userId: user.id, newContent: editContent }),
    });
    const data = await response.json();
    if (data.success) {
      setMessages(prev => prev.map(m =>
        m.id === messageToEdit.id ? { ...m, content: editContent, isEdited: true, editedAt: new Date().toISOString() } : m
      ));
      if (socket) socket.emit('edit_message', { messageId: messageToEdit.id, content: editContent });
      setEditDialogOpen(false);
      setMessageToEdit(null);
      setEditContent('');
      setShowActionMenu(null);
    }
  };

  const handleDeleteAllMessages = async (action: 'mine' | 'all') => {
    if (!user) return;
    const response = await fetch('/api/messages/delete-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, action }),
    });
    const data = await response.json();
    if (data.success) {
      setMessages(action === 'mine' ? prev => prev.filter(m => m.senderId !== user.id) : []);
      setDeleteAllDialogOpen(false);
      setDeleteDialogOpenOwn(false);
    }
  };

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const renderMessageContent = (message: Message) => {
    if (message.messageType === 'text') {
      return <p className="break-words whitespace-pre-wrap">{message.content}</p>;
    }
    if (message.messageType === 'image' && message.fileUrl) {
      return (
        <img src={message.fileUrl} alt={message.fileName} className="max-w-full rounded-lg cursor-pointer hover:opacity-90" onClick={() => window.open(message.fileUrl, '_blank')} />
      );
    }
    if (message.messageType === 'video' && message.fileUrl) {
      return <video src={message.fileUrl} controls className="max-w-full rounded-lg" />;
    }
    if (message.messageType === 'voice' && message.fileUrl) {
      return (
        <div className="flex items-center gap-3 p-2">
          <audio src={message.fileUrl} controls className="h-8 max-w-[200px]" />
          {message.voiceDuration && <span className="text-xs opacity-70">{formatDuration(message.voiceDuration)}</span>}
        </div>
      );
    }
    if (message.messageType === 'document' && message.fileName) {
      return (
        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
          <FileText className="w-8 h-8 text-pink-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{message.fileName}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.open(message.fileUrl, '_blank')}>Download</Button>
        </div>
      );
    }
    return null;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-pink-300">Loading... 💕</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950 relative overflow-hidden">
      {/* Floating Emojis */}
      {floatingEmojis.map((item, i) => (
        <div key={i} className="absolute text-3xl pointer-events-none select-none opacity-30"
          style={{ left: item.left, top: item.top, animation: `floatAndPulse ${6 + Math.random() * 4}s ease-in-out infinite`, animationDelay: `${Math.random() * 3}s` }}>
          {item.emoji}
        </div>
      ))}

      {/* Inactivity Warning */}
      {inactivityWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-900/90 backdrop-blur-md border border-red-500/50 rounded-lg p-4">
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

      {/* Action Menu - Shows on long press */}
      {showActionMenu && (
        <div 
          ref={actionMenuRef}
          className="fixed z-50 bg-slate-800/95 backdrop-blur-xl border border-pink-900/50 rounded-xl shadow-2xl p-2 min-w-[180px]"
          style={{ 
            left: Math.min(actionMenuPosition.x, window.innerWidth - 200),
            top: Math.min(actionMenuPosition.y, window.innerHeight - 250)
          }}
        >
          {/* Quick Reactions */}
          <div className="flex items-center justify-around px-2 py-2 border-b border-white/10 mb-2">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(showActionMenu, emoji)}
                className="text-2xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
          
          {/* Action buttons */}
          <button
            onClick={() => {
              const msg = messages.find(m => m.id === showActionMenu);
              if (msg) {
                setReplyingTo(msg);
              }
              setShowActionMenu(null);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-pink-300 hover:bg-pink-900/30 rounded-lg transition-colors"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>
          
          {(() => {
            const msg = messages.find(m => m.id === showActionMenu);
            const isOwn = msg?.senderId === user.id;
            
            return isOwn && msg?.messageType === 'text' ? (
              <button
                onClick={() => {
                  if (msg) {
                    setMessageToEdit(msg);
                    setEditContent(msg.content || '');
                    setEditDialogOpen(true);
                  }
                  setShowActionMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : null;
          })()}
          
          {(() => {
            const msg = messages.find(m => m.id === showActionMenu);
            const isOwn = msg?.senderId === user.id;
            
            return isOwn ? (
              <button
                onClick={() => {
                  if (msg) {
                    setMessageToDelete(msg.id);
                    setDeleteDialogOpen(true);
                  }
                  setShowActionMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : null;
          })()}
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-pink-900/30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Our Chat 💕</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-pink-300/70">{onlineUsers.size > 1 ? '🟢 Online together' : '🟢 Online'}</span>
                <span className="text-pink-700">•</span>
                <span className="text-sm text-pink-400 font-medium">{user?.emoji} {user?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Call buttons */}
            <Button variant="ghost" size="icon" onClick={() => startCall('voice')} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30" title="Voice Call">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => startCall('video')} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30" title="Video Call">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={startScreenShare} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30" title="Screen Share">
              <Monitor className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowWatchTogether(true)} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30" title="Watch Together">
              <Tv className="w-5 h-5" />
            </Button>

            <Button variant="outline" size="sm" onClick={() => window.location.href = 'https://www.wikipedia.org'} className="border-red-500/50 text-red-400 hover:bg-red-900/30">
              <AlertTriangle className="w-4 h-4 mr-2" /> Panic
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-pink-300 hover:text-pink-100">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
                <DropdownMenuItem onClick={() => setDeleteDialogOpenOwn(true)} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete My Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteAllDialogOpen(true)} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete All Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { localStorage.removeItem('chat-user'); router.push('/'); }} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Leave Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Call UI */}
      {(callState.status !== 'idle' || localStream || remoteStream) && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
          {remoteStream && (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />
          )}
          {localStream && callState.type === 'video' && (
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-24 right-4 w-48 h-36 rounded-lg border-2 border-pink-500 object-cover z-10" />
          )}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
            {callState.status === 'ringing' ? (
              <>
                <Button onClick={answerCall} className="bg-green-600 hover:bg-green-700 text-white rounded-full w-16 h-16">
                  <Phone className="w-6 h-6" />
                </Button>
                <Button onClick={declineCall} className="bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16">
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </>
            ) : (
              <Button onClick={endCall} className="bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16">
                <PhoneOff className="w-6 h-6" />
              </Button>
            )}
          </div>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white text-lg">
            {callState.status === 'calling' && <p>Calling...</p>}
            {callState.status === 'ringing' && <p>Incoming {callState.type} call...</p>}
            {callState.status === 'connected' && <p>{callState.type === 'screen' ? 'Screen sharing' : 'Connected'}</p>}
          </div>
        </div>
      )}

      {/* Watch Together Modal */}
      {showWatchTogether && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50 p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-pink-100 mb-4 flex items-center gap-2">
              <Tv className="w-5 h-5" /> Watch Together
            </h2>
            <Input
              placeholder="Enter video URL..."
              className="bg-slate-800/50 border-pink-700/50 text-pink-100 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  startWatchTogether((e.target as HTMLInputElement).value);
                }
              }}
            />
            <div className="flex gap-2">
              <Button onClick={() => setShowWatchTogether(false)} variant="outline" className="flex-1 border-pink-700/50 text-pink-300">Cancel</Button>
              <Button onClick={() => {
                const input = document.querySelector('input[placeholder="Enter video URL..."]') as HTMLInputElement;
                if (input?.value) startWatchTogether(input.value);
              }} className="flex-1 bg-pink-600 hover:bg-pink-700">Start</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Watch Together Player */}
      {watchTogether.active && (
        <div className="fixed bottom-24 right-4 z-30 w-80">
          <Card className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50 overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b border-pink-900/30">
              <span className="text-sm text-pink-300 flex items-center gap-1">
                <Users className="w-4 h-4" /> Watch Together
              </span>
              <Button size="icon" variant="ghost" onClick={endWatchTogether} className="h-6 w-6 text-pink-400 hover:text-pink-100">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <video
              src={watchTogether.videoUrl}
              className="w-full aspect-video"
              controls
              onPlay={() => syncWatchTogether(watchTogether.currentTime, true)}
              onPause={() => syncWatchTogether(watchTogether.currentTime, false)}
              onTimeUpdate={(e) => setWatchTogether(prev => ({ ...prev, currentTime: (e.target as HTMLVideoElement).currentTime }))}
            />
          </Card>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Heart className="w-12 h-12 text-pink-400 fill-pink-400/30" />
              </div>
              <p className="text-pink-300 font-medium text-lg">No messages yet 💕</p>
              <p className="text-sm text-pink-400/60 mt-2">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user.id;
              const reactions = message.reactions || [];

              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] md:max-w-[70%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {/* WhatsApp-style reply preview - ABOVE the message bubble */}
                    {message.replyToId && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                        isOwn ? 'bg-pink-600/40 text-pink-100' : 'bg-slate-700/60 text-pink-200'
                      } border-l-2 border-purple-400 mb-1`}>
                        <Reply className="w-3 h-3 flex-shrink-0 text-purple-300" />
                        <span className="font-semibold text-purple-300">{message.replyToSender || 'User'}</span>
                        <span className="text-white/60 truncate max-w-[150px]">{message.replyToContent || '...'}</span>
                      </div>
                    )}

                    <div className="relative">
                      <Card
                        className={`p-0 overflow-hidden backdrop-blur-md transition-all cursor-pointer select-none ${
                          isOwn
                            ? 'bg-gradient-to-br from-pink-600/80 to-purple-600/80 text-white border-0 shadow-xl shadow-pink-900/20'
                            : 'bg-slate-800/60 backdrop-blur-md border-pink-900/30'
                        }`}
                        onTouchStart={(e) => handleLongPressStart(e, message)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={(e) => handleLongPressStart(e, message)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                      >
                        {/* Main message content */}
                        <div className="p-4">
                          {!isOwn && message.senderName && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm">{message.senderEmoji || '💕'}</span>
                              <span className="text-xs text-pink-400 font-medium">{message.senderName}</span>
                            </div>
                          )}
                          {renderMessageContent(message)}
                          {message.isEdited && (
                            <p className="text-xs text-white/50 mt-2 italic">✏️ Edited</p>
                          )}
                        </div>
                      </Card>

                      {/* Reactions - Lower left corner of the message */}
                      {reactions.length > 0 && (
                        <div className={`absolute -bottom-3 ${isOwn ? 'left-2' : 'left-2'} flex items-center gap-0.5 bg-slate-900/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-lg border border-pink-900/30`}>
                          {Object.entries(reactions.reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)).map(([emoji, count]) => (
                            <span key={emoji} className="inline-flex items-center text-sm">
                              {emoji} {count > 1 && <span className="text-pink-300 text-xs ml-0.5">{count}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Time & seen */}
                    <div className={`flex items-center gap-2 px-1 ${reactions.length > 0 ? 'mt-4' : ''}`}>
                      <span className="text-xs text-pink-400/50">{formatTime(message.createdAt)}</span>
                      {isOwn && message.seen && <span className="text-xs text-pink-400/50">Seen 💕</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/80 backdrop-blur-xl border-t border-pink-900/30 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Reply preview */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-3 mb-2 px-4 py-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Reply className="w-4 h-4 text-purple-300" />
                <div>
                  <span className="text-xs font-semibold text-purple-300">Replying to {replyingTo.senderName}</span>
                  <p className="text-xs text-white/60 truncate">{replyingTo.content || '...'}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0 text-purple-400">
                ✕
              </Button>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-3 mb-2 px-4 py-2 bg-red-900/30 rounded-lg border border-red-700/50">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-300 text-sm">Recording: {formatDuration(recordingTime)}</span>
              <Button variant="ghost" size="sm" onClick={stopVoiceRecording} className="ml-auto text-red-400">Stop</Button>
            </div>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 right-4 bg-slate-800/95 backdrop-blur-xl border border-pink-900/50 rounded-lg p-3 max-w-2xl mx-auto z-50">
              <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-2 border-b border-white/10">
                {EMOJI_CATEGORIES.map((category, index) => (
                  <button key={index} onClick={() => setSelectedCategory(index)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-2xl ${selectedCategory === index ? 'bg-pink-600/30 ring-2 ring-pink-500' : 'hover:bg-white/10'}`}>
                    {category.icon}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
                {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji, index) => (
                  <button key={index} onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-2xl p-2 hover:bg-pink-900/30 rounded-lg">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" />

            <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="border-pink-700/50 hover:bg-pink-900/30 text-pink-300">
              {uploading ? <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
            </Button>

            <Button type="button" variant="outline" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`border-pink-700/50 hover:bg-pink-900/30 text-pink-300 ${showEmojiPicker ? 'bg-pink-900/30' : ''}`}>
              <Smile className="w-4 h-4" />
            </Button>

            <Button type="button" variant="outline" size="icon" onMouseDown={startVoiceRecording} onMouseUp={stopVoiceRecording} onTouchStart={startVoiceRecording} onTouchEnd={stopVoiceRecording} className={`border-pink-700/50 hover:bg-pink-900/30 text-pink-300 ${isRecording ? 'bg-red-900/50 animate-pulse' : ''}`}>
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message... 💕" className="flex-1 bg-slate-800/50 border-pink-700/50 text-pink-100" disabled={sending || uploading} />

            <Button type="submit" size="icon" disabled={!input.trim() || sending} className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500">
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </footer>

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Delete message?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Edit Message</AlertDialogTitle>
          </AlertDialogHeader>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-32 bg-slate-800/50 border-pink-700/50 rounded-lg p-3 text-pink-100" />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditMessage} className="bg-blue-600 hover:bg-blue-700" disabled={!editContent.trim()}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete All Messages?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">This will delete ALL messages for both users!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteAllMessages('all')} className="bg-red-600 hover:bg-red-700">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpenOwn} onOpenChange={setDeleteDialogOpenOwn}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Delete Your Messages?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">This will delete only YOUR messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteAllMessages('mine')} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        @keyframes floatAndPulse {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
