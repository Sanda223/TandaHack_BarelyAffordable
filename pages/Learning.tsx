import React, { useState } from 'react';
import { LearningItem as LearningItemType } from '../types';
import Card from '../components/Card';
import Icon from '../components/Icon';

// Extend LearningItemType to use icons and a learn more URL
interface LearningItem extends Omit<LearningItemType, 'emoji'> {
  icon: React.ComponentProps<typeof Icon>['name'];
  learnMoreUrl: string;
}

const initialLearningItems: LearningItem[] = [
  { id: 'lmi', title: "Lender's Mortgage Insurance (LMI)", icon: 'shield-check', content: "LMI protects the lender if you borrow over 80% of a property's value. It's a one-off premium you pay.", completed: true, learnMoreUrl: 'https://www.ato.gov.au/individuals-and-families/your-home-and-property/investment-properties/rental-expenses-to-claim/loan-interest-and-other-borrowing-expenses' },
  { id: 'stamp-duty', title: 'Stamp Duty', icon: 'document-text', content: "A state government tax on property transfers. The amount varies by state and property value. First-home buyer concessions may apply!", completed: false, learnMoreUrl: 'https://www.ato.gov.au/individuals-and-families/your-home-and-property/your-main-residence/calculating-the-cost-base-for-your-main-residence' },
  { id: 'grants', title: 'First Home Super Saver Scheme', icon: 'gift', content: 'A government scheme to help you save for your first home inside your super fund, offering tax benefits.', completed: false, learnMoreUrl: 'https://www.ato.gov.au/individuals-and-families/your-home-and-property/first-home-super-saver-scheme' },
  { id: 'pre-approval', title: 'Pre-Approval', icon: 'badge-check', content: "An indication from a lender of how much you can likely borrow. It's not a full loan approval but makes you a more serious buyer.", completed: false, learnMoreUrl: 'https://www.ato.gov.au/individuals-and-families/your-home-and-property' },
  { id: 'offset', title: 'Offset Accounts', icon: 'library', content: "A transaction account linked to your home loan. Its balance reduces your loan principal, saving you interest.", completed: false, learnMoreUrl: 'https://www.ato.gov.au/individuals-and-families/your-home-and-property/investment-properties/rental-expenses-to-claim/interest-expenses#ato-Loanarrangements' },
];

const LearningCard: React.FC<{ item: LearningItem; onToggleComplete: (id: string) => void; }> = ({ item, onToggleComplete }) => {
  return (
    <details className="group rounded-2xl border border-gray-100 bg-card-bg p-4 shadow-subtle transition-shadow duration-300 hover:shadow-subtle-hover [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between gap-1.5">
            <div className="flex items-center">
                <span className="text-3xl mr-4 text-primary"><Icon name={item.icon} className="w-8 h-8"/></span>
                 <h2 className="font-bold text-text-primary">{item.title}</h2>
            </div>
            <div className="flex items-center">
                 <button onClick={(e) => { e.stopPropagation(); onToggleComplete(item.id); }} className="p-2 mr-2 focus:outline-none focus:ring-2 focus:ring-accent rounded-full">
                    {item.completed ? 
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center"><Icon name="check" className="w-4 h-4 text-white" /></div> :
                      <div className="w-7 h-7 rounded-full border-2 border-gray-300 transition-colors group-hover:border-accent"></div>
                    }
                </button>
                <span className="transition group-open:rotate-180 text-text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </span>
            </div>
        </summary>
        <div className="mt-4 px-4 leading-relaxed text-text-secondary text-sm">
            <p>{item.content}</p>
            <a 
              href={item.learnMoreUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center mt-4 text-sm font-semibold text-primary hover:text-accent transition-colors group-hover:underline"
            >
              Learn More on ATO.gov.au
              <Icon name="arrow-right" className="w-4 h-4 ml-1.5" />
            </a>
        </div>
    </details>
  );
};

const Learning: React.FC = () => {
  const [items, setItems] = useState<LearningItem[]>(initialLearningItems);
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [answerPreview, setAnswerPreview] = useState<string | null>(null);

  const handleToggleComplete = (id: string) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };
  
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsThinking(true);
    setAnswerPreview(null);
    setTimeout(() => {
      setAnswerPreview("Great question! We'll soon use AI here to give you personalized guidance.");
      setIsThinking(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-text-primary">Learning Center</h1>
        <p className="text-text-secondary mt-1 flex items-center">
          Key concepts for your home buying journey.
          <Icon name="academic-cap" className="w-5 h-5 ml-2" />
        </p>
      </header>

      <Card>
        <form className="space-y-3" onSubmit={handleAskQuestion}>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about buying a home…"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              disabled={!question.trim() || isThinking}
            >
              {isThinking ? 'Thinking…' : 'Ask'}
            </button>
          </div>
          {answerPreview && (
            <p className="text-sm text-text-primary bg-light-gray rounded-xl px-4 py-3">
              {answerPreview}
            </p>
          )}
          {!answerPreview && (
            <p className="text-xs text-text-secondary">Powered by AI soon – we’ll connect a chatbot to answer detailed finance questions.</p>
          )}
        </form>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-text-primary">Your Progress</h2>
            <span className="font-bold text-primary">{completedCount} / {totalCount} Completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-accent h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </Card>
      
      <div className="space-y-4">
        {items.map(item => (
          <LearningCard key={item.id} item={item} onToggleComplete={handleToggleComplete} />
        ))}
      </div>
    </div>
  );
};

export default Learning;
