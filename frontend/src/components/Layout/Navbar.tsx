import React from 'react';
import { MyConnectButton } from '../MyConnectButton';
import { useSIWE } from 'connectkit';
import { getTokenContract } from '../../contracts';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export const Navbar: React.FC = () => {
    const { isSignedIn } = useSIWE();
    const { address } = useAccount();

    const { data: balance } = useBalance({
        address: address,
        token: getTokenContract().address,
    });

    return (
        <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center">
                    <a href="/" className="text-xl font-bold text-gray-800 hover:pointer hover:text-purple-600">FitFi</a>
                </div>
                <div className="flex items-center">
                    <MyConnectButton />

                    {isSignedIn && balance && <div className="flex items-center ml-3 text-sm font-bold">{formatEther(balance.value)} <span className='ml-1'>f$</span></div>}

                </div>
            </div>
        </nav>
    );
};


