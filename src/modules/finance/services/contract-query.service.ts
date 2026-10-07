import { Injectable } from "@nestjs/common";
import { QueryContractDto } from "@modules/finance/dto/contract.dto";

@Injectable()
export class ContractQueryService {
  async getAllContracts(query: QueryContractDto, _user: any) {
    return {
      items: [
        {
          id: "contract-demo-1",
          contractCode: "HD-2026/01/VINI",
          title: "Hợp đồng Cung cấp Dịch vụ Phần mềm",
          status: "ACTIVE",
          totalAmount: 150000000,
          customer: {
            id: "cust-1",
            name: "Công ty Cổ phần Vini Corp",
          },
          createdAt: new Date(),
        },
      ],
      total: 1,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    };
  }

  async getContractById(id: string, _user: any) {
    return {
      id,
      contractCode: "HD-2026/01/VINI",
      title: "Hợp đồng Cung cấp Dịch vụ Phần mềm",
      status: "ACTIVE",
      totalAmount: 150000000,
      vatRate: 10,
      customer: {
        id: "cust-1",
        name: "Công ty Cổ phần Vini Corp",
      },
      services: [],
      paymentMilestones: [],
    };
  }
}
